"use strict"

###
Test Server - CoffeeScript Edition
###
app = require("./app.coffee")
start = Date.now()
log = (message) ->
  console.log "[" + (Date.now() - start) + "] " + message

log "Begin coffeescript-server.coffee"
setTimeout (->
  module.exports = app.listen(app.get("port"), ->
    log "Express server listening on port " + app.get("port")
  )
), 50
setTimeout (->
  log "250ms timeout"
), 250
log "End coffeescript-server.coffee"
