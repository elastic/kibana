
/**
 * Module dependencies.
 */

var connect = require('../');

// $ curl -i http://localhost:3000/favicon.ico
// true defaults to 1000ms

connect.createServer(
    connect.logger({ buffer: 5000 })
  , connect.favicon()
).listen(3000);