
/**
 * Module dependencies.
 */

var connect = require('../');

connect.createServer(function(req, res){
  var body = 'Hello World';
  res.setHeader('Content-Length', body.length);
  res.end(body);
}).listen(3000);