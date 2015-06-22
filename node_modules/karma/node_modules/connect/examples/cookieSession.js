
var connect = require('../')
  , http = require('http');

var app = connect()
  .use(connect.logger('dev'))
  .use(connect.bodyParser())
  .use(connect.cookieParser())
  .use(connect.cookieSession({ secret: 'some secret' }))
  .use(post)
  .use(clear)
  .use(counter);

function clear(req, res, next) {
  if ('/clear' != req.url) return next();
  req.session = null;
  res.statusCode = 302;
  res.setHeader('Location', '/');
  res.end();
}

function post(req, res, next) {
  if ('POST' != req.method) return next();
  req.session.name = req.body.name;
  next();
}

function counter(req, res) {
  req.session.count = req.session.count || 0;
  var n = req.session.count++;
  var name = req.session.name || 'Enter your name';
  res.end('<p>hits: ' + n + '</p>'
    + '<form method="post">'
    + '<p><input type="text" name="name" value="' + name + '" />'
    + '<input type="submit" value="Save" /></p>'
    + '</form>'
    + '<p><a href="/clear">clear session</a></p>');
}

http.createServer(app).listen(3000);
console.log('Server listening on port 3000');
