"use strict";

/**
 * Test Server
 */

var app   = require('./app');
var start = Date.now();
var log   = function(message) {
  console.log("[" + (Date.now() - start) + "] " + message);
};

log("Begin server.js");

setTimeout(function() {
  module.exports = app.listen(app.get('port'), function() {
    log("Express server listening on port " + app.get('port'));
  });
}, 50);

setTimeout(function() {
  log("250ms timeout");
}, 250);

log("End server.js");
