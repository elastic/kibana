
/**
 * Module dependencies.
 */

var connect = require('../');

// $ curl -i http://localhost:3000/favicon.ico

connect.createServer(
  connect.favicon()
).listen(3000);