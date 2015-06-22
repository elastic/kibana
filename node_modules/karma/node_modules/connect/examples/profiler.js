
/**
 * Module dependencies.
 */

var connect = require('../');

// $ curl -i http://localhost:3000/

connect(
    connect.profiler()
  , connect.favicon()
  , connect.static(__dirname)
  , function(req, res, next){
    res.end('hello world');
  }
).listen(3000);
