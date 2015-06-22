"use strict"

express = require("express")
app     = module.exports = express()
env     = (process.env.NODE_ENV or 'development')

app.set 'port', (process.env.PORT or 3000)

app.get "/", (req, res) ->
  res.send "Howdy from CoffeeScript!"
