
/**
 * Module dependencies.
 */

var connect = require('../');

connect(
    connect.static(__dirname + '/public', { maxAge: 0 })
  , function(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.end('<img src="/tobi.jpeg" />')
  }
).listen(3000);