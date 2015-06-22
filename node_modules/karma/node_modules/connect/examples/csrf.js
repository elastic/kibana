
/**
 * Module dependencies.
 */

var connect = require('../')
  , http = require('http');

var form = '\n\
  <form action="/" method="post">\n\
    <input type="hidden" name="_csrf" value="{token}" />\n\
    <input type="text" name="user[name]" value="{user}" placeholder="Username" />\n\
    <input type="submit" value="Login" />\n\
  </form>\n\
'; 

var app = connect()
  .use(connect.cookieParser())
  .use(connect.session({ secret: 'keyboard cat' }))
  .use(connect.bodyParser())
  .use(connect.csrf())
  .use(function(req, res, next){
    if ('POST' != req.method) return next();
    req.session.user = req.body.user;
    next();
  })
  .use(function(req, res){
    res.setHeader('Content-Type', 'text/html');
    var body = form
      .replace('{token}', req.csrfToken())
      .replace('{user}', req.session.user && req.session.user.name || '');
    res.end(body);
  });

http.createServer(app).listen(3000);
console.log('Server listening on port 3000');
