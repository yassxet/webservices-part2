const express = require("express");
const app = express();
const cors = require("cors");
app.use(cors());
let bodyParser = require("body-parser");
app.use(bodyParser.raw({ type: "*/*" }));

app.use(express.static("public"));


/*app.get("/", (req, res) => {
    res.sendFile(__dirname + "/views/index.html");
});*/

app.get("/sourcecode", (req, res) => {
    res.send(
        require("fs")
            .readFileSync(__filename)
            .toString()
    );
});

let tokenGenerator = () => {
    let token = ""
    token = "token" + Math.floor(Math.random() * 1000000);
    return token;
};

let users = new Map(); //Username & password
let tokens = new Map(); //Username & generatedToken
let token_username = new Map(); //generatedToken & username

let listings = new Map()  //listingId & content
let listingIds = []
let cart = []
let itemPuscharsedByUser = new Map() //Token & items in cart
let itemPuscharsed = []
let messages = [];
let itemShipped = []
let sellerReview = []//Seller & username

app.post("/signup", (req, res) => {

    let parsedBody = JSON.parse(req.body);
    if (users.has(parsedBody.username)) {
        res.send(JSON.stringify({ success: false, reason: "Username exists" }));
    } else if (parsedBody.username == undefined) {
        res.send(
            JSON.stringify({ success: false, reason: "username field missing" })
        );
    } else if (parsedBody.password == undefined) {
        res.send(
            JSON.stringify({ success: false, reason: "password field missing" })
        );
    } else {
        res.send(JSON.stringify({ success: true }));
        users.set(parsedBody.username, parsedBody.password);
    }
});


app.post("/login", (req, res) => {
    let parsedBody = JSON.parse(req.body);
    let testPassword = parsedBody.password;
    let expectedPassword = users.get(parsedBody.username);

    //Generate random token
    if (users.has(parsedBody.username) && testPassword === expectedPassword) {
        tokens.set(parsedBody.username, tokenGenerator(10));
        token_username.set(tokens.get(parsedBody.username), parsedBody.username);

        res.send(
            JSON.stringify({ success: true, token: tokens.get(parsedBody.username) })
        );
    } else if (!users.has(parsedBody.username)) {
        if (parsedBody.username === undefined) {
            res.send(
                JSON.stringify({ success: false, reason: "username field missing" })
            );
        } else
            res.send(
                JSON.stringify({ success: false, reason: "User does not exist" })
            );
    } else if (testPassword !== expectedPassword) {
        if (parsedBody.password === undefined) {
            res.send(
                JSON.stringify({ success: false, reason: "password field missing" })
            );
        } else {
            res.send(JSON.stringify({ success: false, reason: "Invalid password" }));
        }
    }
});


app.post("/change-password", (req, res) => {
    let parsedBody = JSON.parse(req.body);
    let newPassword = parsedBody.newPassword;
    let oldPassword = parsedBody.oldPassword;


    if (req.headers.token === undefined) {
        res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    }
    else if (tokens.get(token_username.get(req.headers.token)) !== req.headers.token) {
        res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    }
    else if (users.get(token_username.get(req.headers.token)) !== oldPassword) {
        res.send(JSON.stringify({ "success": false, "reason": "Unable to authenticate" }));
    } else {
        users.set(token_username.get(req.headers.token), newPassword)
        res.send(JSON.stringify({ "success": true }));
        // console.log("Password changed !")
    }
});


app.post("/create-listing", (req, res) => {
    let parsedBody = JSON.parse(req.body);
    let price = parsedBody.price;
    let description = parsedBody.description;


    if (req.headers.token === undefined) {
        res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    }
    else if (tokens.get(token_username.get(req.headers.token)) !== req.headers.token) {
        res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    }
    else if (price === undefined) {
        res.send(JSON.stringify({ "success": false, "reason": "price field missing" }));

    } else if (description === undefined) {
        res.send(JSON.stringify({ "success": false, "reason": "description field missing" }));

    } else {

        let idGenerator = () => {
            let id = "";
            id = "id-" + Math.floor(Math.random() * 100000);
            return id;
        }


        let listingId = idGenerator()
        //console.log(tokens.get(token_username.get(req.headers.token))+"---"+req.headers.token)


        res.send(JSON.stringify({ "success": true, "listingId": listingId }));
        listingIds.push(listingId)
        listings.set(listingId, {
            price: price,
            description: description,
            itemId: listingId,
            sellerUsername: token_username.get(req.headers.token)
        });

        //console.log(arr.length)
    }// console.log(listings.size+"---"+listingIds+"--TOKEN--"+req.headers.token)
});

app.get("/listing", (req, res) => {

    let queryString = req.originalUrl;
    let queryParams = new URLSearchParams(queryString);
    //console.log(listings[0].price)

    if (!listingIds.includes(queryParams.get("/listing?listingId"))) {
        res.send(
            JSON.stringify({ "success": false, "reason": "Invalid listing id" })
        );
    } else {
        res.send(JSON.stringify({ "success": true, "listing": listings.get(queryParams.get("/listing?listingId")) }))

    }
});

app.post("/modify-listing", (req, res) => {
    let parsedBody = JSON.parse(req.body);
    let itemId = parsedBody.itemid;
    let price = parsedBody.price;
    let description = parsedBody.description;

    if (req.headers.token === undefined) {
        res.send(JSON.stringify({ success: false, reason: "token field missing" }));
    } else if (
        tokens.get(token_username.get(req.headers.token)) !== req.headers.token
    ) {
        res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    } else if (itemId === undefined) {
        res.send(
            JSON.stringify({ success: false, reason: "itemid field missing" })
        );
    } else {
        if (price === undefined && listings.get(itemId) !== undefined) {
            listings.get(itemId).description = description;
        } else if (
            description === undefined &&
            listings.get(itemId) !== undefined
        ) {
            listings.get(itemId).price = price;
        } else {
            listings.get(itemId).description = description;
            listings.get(itemId).price = price;
        }

        res.send(JSON.stringify({ success: true }));
    }
});


app.post("/add-to-cart", (req, res) => {

    let parsedBody = JSON.parse(req.body);
    let itemId = parsedBody.itemid;

    if (tokens.get(token_username.get(req.headers.token)) !== req.headers.token) {
        res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    }
    else if (itemId === undefined) {
        res.send(
            JSON.stringify({ success: false, reason: "itemid field missing" })
        );
    } else if (!listingIds.includes(itemId)) {
        res.send(JSON.stringify({ "success": false, "reason": "Item not found" }));
    } else {
        cart.push({ token: req.headers.token, item: itemId })
        res.send(JSON.stringify({ "success": true }));
    }
});


app.get("/cart", (req, res) => {
    let cartUser = [];

    if (tokens.get(token_username.get(req.headers.token)) !== req.headers.token) {
        res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    } else {
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].token === req.headers.token) {
                cartUser.push(listings.get(cart[i].item));
            }
        }

        res.send(JSON.stringify({ success: true, cart: cartUser }));
    }
});


app.post("/checkout", (req, res) => {
    let cartUser = [];
    let notAvailable = false;

    for (let i = 0; i < cart.length; i++) {
        if (cart[i].token === req.headers.token) {
            cartUser.push(listings.get(cart[i].item));
        }
    }

    for (let j = 0; j < cartUser.length; j++) {
        if (itemPuscharsed.includes(cartUser[j].itemId)) {
            notAvailable = true;
            break;
        } else
            itemPuscharsed.push(cartUser[j].itemId);
    }

    if (tokens.get(token_username.get(req.headers.token)) !== req.headers.token) {

        res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    }

    else if (cartUser.length === 0) {
        res.send(JSON.stringify({ success: false, reason: "Empty cart" }));
    } else if (notAvailable) {
        res.send(JSON.stringify({ success: false, reason: "Item in cart no longer available" }));
    } else

        res.send(JSON.stringify({ success: true }));
    //Items in cart
    itemPuscharsedByUser.set(req.headers.token, cartUser);

});



app.get("/purchase-history", (req, res) => {
    let cartUser = [];

    if (tokens.get(token_username.get(req.headers.token)) !== req.headers.token) {
        res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    } else {
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].token === req.headers.token) {
                cartUser.push(listings.get(cart[i].item));
            }
        }

        res.send(JSON.stringify({ success: true, purchased: cartUser }));
    }
});




app.post("/chat", (req, res) => {

    if (tokens.get(token_username.get(req.headers.token)) !== req.headers.token) {
        res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    }

    else if (JSON.parse(req.body).destination === undefined) {
        res.send(
            JSON.stringify({ "success": false, "reason": "destination field missing" })
        );
    }
    else if (JSON.parse(req.body).contents === undefined) {
        res.send(
            JSON.stringify({ success: false, reason: "contents field missing" })
        );
    } else if (![...users.keys()].includes(JSON.parse(req.body).destination)) {
        res.send(
            JSON.stringify({ "success": false, "reason": "Destination user does not exist" })
        );
    }
    else {
        res.send(JSON.stringify({ "success": true }));
        messages.push({
            from: token_username.get(req.headers.token),
            destination: JSON.parse(req.body).destination,
            contents: JSON.parse(req.body).contents
        })
    }
    //console.log("body:  " +req.body)

});



app.post("/chat-messages", (req, res) => {

    let chat = []
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].from !== messages[i].destination)
            chat.push({ from: messages[i].from, contents: messages[i].contents })
    }

    if (tokens.get(token_username.get(req.headers.token)) !== req.headers.token) {
        res.send(JSON.stringify({ success: false, reason: "Invalid token" }));
    }
    else if (![...users.keys()].includes(JSON.parse(req.body).destination)) {
        if (JSON.parse(req.body).destination === undefined) {
            res.send(
                JSON.stringify({ "success": false, "reason": "destination field missing" })
            );
        } else
            res.send(
                JSON.stringify({ "success": false, "reason": "Destination user not found" })
            );

    }

    else
        res.send(JSON.stringify({ "success": true, messages: chat }));
        console.log(chat)


});



app.post("/ship", (req, res) => {
    if (!itemPuscharsed.includes(JSON.parse(req.body).itemid)) {
        res.send(JSON.stringify({ success: false, reason: "Item was not sold" }));
    } else if (itemShipped.includes(JSON.parse(req.body).itemid)) {
        if (JSON.parse(req.body).destination === undefined) {
            res.send(
                JSON.stringify({ success: false, reason: "Item has already shipped" })
            );
        }
    } else if (
        listings.get(JSON.parse(req.body).itemid).sellerUsername !== token_username.get(req.headers.token)) {
        res.send(
            JSON.stringify({
                success: false,
                reason: "User is not selling that item"
            })
        );
    }
    else
        res.send(JSON.stringify({ success: true }));
    itemShipped.push(JSON.parse(req.body).itemid);
});


app.get("/status", (req, res) => {

    let queryString = req.originalUrl;
    let queryParams = new URLSearchParams(queryString);


    if (!itemPuscharsed.includes(queryParams.get("/status?itemid"))) {
        res.send(JSON.stringify({ "success": false, "reason": "Item not sold" }));

    } else
        if (!itemShipped.includes(queryParams.get("/status?itemid"))) {
            res.send(JSON.stringify({ "success": true, "status": "not-shipped" }));

        } else
            res.send(JSON.stringify({ "success": true, "status": "shipped" }));
});


app.post("/review-seller", (req, res) => {
    let arr = []
    let _items = []

    if (itemPuscharsedByUser.get(req.headers.token) !== undefined) {
        for (let j = 0; j < itemPuscharsedByUser.get(req.headers.token).length; j++) {
            arr.push(itemPuscharsedByUser.get(req.headers.token)[j].itemId)
        }
    }

    for (let i = 0; i < sellerReview.length; i++) {
        if (sellerReview[i].itemid === JSON.parse(req.body).itemid) {
            _items.push(JSON.parse(req.body).itemid)
        }

    }


    if (tokens.get(token_username.get(req.headers.token)) !== req.headers.token) {
        res.send(JSON.stringify({ success: false, reason: "Invalid token" }));

    } else if (!listingIds.includes(JSON.parse(req.body).itemid) || !arr.includes(JSON.parse(req.body).itemid)) {
        res.send(JSON.stringify({ "success": false, "reason": "User has not purchased this item" }));

    } else if (!_items.includes(JSON.parse(req.body).itemid)) {
        res.send(JSON.stringify({ "success": true }));
        _items.push(JSON.parse(req.body).itemid)
        sellerReview.push({ "from": token_username.get(req.headers.token), "numStars": JSON.parse(req.body).numStars, "contents": JSON.parse(req.body).contents, "itemid": JSON.parse(req.body).itemid, seller: listings.get(JSON.parse(req.body).itemid).sellerUsername })

    }
    else
        res.send(JSON.stringify({ "success": false, "reason": "This transaction was already reviewed" }));

});



app.get("/reviews", (req, res) => {

    let queryString = req.originalUrl;
    let queryParams = new URLSearchParams(queryString);
    let review = []
    for (let i = 0; i < sellerReview.length; i++) {

        if (sellerReview[i].seller === queryParams.get("/reviews?sellerUsername"))

            review.push({
                "from": sellerReview[i].from,
                "numStars": sellerReview[i].numStars,
                "contents": sellerReview[i].contents
            })
    }
    //console.log(queryParams.get("/reviews?sellerUsername"))
    res.send(JSON.stringify({ "success": true, "reviews": review }));
});




app.get("/selling", (req, res) => {

    let queryString = req.originalUrl;
    let queryParams = new URLSearchParams(queryString);
    let selling = []


    for (let i = 0; i < [...listings.values()].length; i++) {

        if ([...listings.values()][i].sellerUsername === queryParams.get("/selling?sellerUsername"))
            selling.push([...listings.values()][i])
    }



    if (queryString === '/selling') {
        res.send(JSON.stringify({ "success": false, "reason": "sellerUsername field missing" }));

    } else
        res.send(JSON.stringify({ "success": true, "selling": selling }));

});




// listen for requests :)
const listener = app.listen(process.env.PORT || 3000, () => {
    console.log("Your app is listening on port " + listener.address().port);
});
