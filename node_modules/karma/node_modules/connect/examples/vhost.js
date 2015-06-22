
/**
 * Module dependencies.
 */

var connect = require('../');

var account = connect(function(req, res){
  var location = 'http://localhost:3000/account/' + req.headers.host.split('.localhost')[0];
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end('Moved to ' + location);
});

var blog = connect(function(req, res){
  res.end('blog app');
});

var main = connect(function(req, res){
  if (req.url == '/') return res.end('main app');
  if (0 == req.url.indexOf('/account/')) return res.end('viewing user account for ' + req.url.substring(9));
  res.statusCode = 404;
  res.end();
});

connect(
    connect.logger()
  , connect.vhost('blog.localhost', blog)
  , connect.vhost('*.localhost', account)
  , main
).listen(3000);
