const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const ObjectId = require("mongodb").ObjectId;
const admin = require("firebase-admin");
const mongoose = require("mongoose");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const adminsdk = "./narisha-jewels-firebase-adminsdk.json";

var serviceAccount = require(process.env.NARISHA_JEWELS_ADMIN_SDK);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
// console.log(process.env.NARISHA_JEWELS_ADMIN_SDK);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.q8eugv0.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//verify token
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("narisha");
    const productsCollection = database.collection("products");
    const ordersCollection = database.collection("orders");
    const usersCollection = database.collection("users");

    // GET API
    app.get("/products", async (req, res) => {
      const cursor = productsCollection.find({});
      const products = await cursor.toArray();

      res.send(products);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(query);
      // console.log('load product with id: ', id);
      res.send(product);
    });

    app.post("/products", async (req, res) => {
      const getProduct = req.body;
      const result = await productsCollection.insertOne(getProduct);
      console.log("got new product", req.body);
      console.log("added product", result);
      res.json(result);
    });

    app.post("/orders", async (req, res) => {
      const getOrders = req.body;
      const result = await ordersCollection.insertOne(getOrders);
      console.log("got new order", req.body);
      console.log("added order into database", result);
      res.json(result);
    });

    app.get("/orders", async (req, res) => {
      const cursor = ordersCollection.find().sort({ _id: -1 });
      const products = await cursor.toArray();
      res.send(products);
    });

    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      console.log("deleting order with id ", result);
      res.json(result);
    });

    // app.get("/orders", verifyToken, async (req, res) => {
    //   const email = req.query.email;
    //   if (req.decodedUserEmail === email) {
    //     const query = { email: email };
    //     const cursor = ordersCollection.find(query);
    //     const orders = await cursor.toArray();
    //     res.json(orders);
    //   } else {
    //     res.status(401).json({ message: "User not authorized" });
    //   }
    // });
    //useremail

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      console.log(result);
      res.json(result);
    });

    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateProduct = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      res.json(result);
    });

    app.put("/users/admin", verifyToken, async (req, res) => {
      console.log("admin hitted");
      const user = req.body;
      console.log("request email", user);
      const requester = req.decodedEmail;
      console.log("Admin Email:", requester);
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateProduct = { $set: { role: "admin" } };
          console.log(updateDoc);
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
          console.log(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "you do not have access to make admin" });
      }
    });

    //update API
    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updateProducts = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const handleProduct = {
        $set: {
          title: updateProducts.title,
          category: updateProducts.category,
          description: updateProducts.description,
          price: updateProducts.price,
          image: updateProducts.image,
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        handleProduct,
        options
      );
      console.log("updating", id);
      res.json(result);
    });

    // DELETE API
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      console.log("deleting poem with id ", result);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Running Narisha Jewels Server");
});

app.listen(port, () => {
  console.log("Running Server on port", port);
});
