
var connect = require('../')
var http = require('http');

var hour = 60 * 60 * 1000;

// maxAge session without the rolling option
// it doesn't update the maxAge value

http.createServer(connect()
  .use(connect.cookieParser())
  .use(connect.session({ secret  : 'keyboard cat',
                         key     : 'NoRolling.sid',
                         cookie  : { maxAge: hour }}))
  .use(connect.favicon())
  .use(clear)
  .use(change)
  .use(counter)
  ).listen(3000);
console.log('port 3000: without rolling, session CANNOT be changed to browser session');

// maxAge session with the rolling option
// it always updates the maxAge value

http.createServer(connect()
  .use(connect.cookieParser())
  .use(connect.session({ secret  : 'keyboard cat',
                         key     : 'Rolling.sid',
                         cookie  : { maxAge: hour },
                         rolling : true}))
  .use(connect.favicon())
  .use(clear)
  .use(change)
  .use(counter)
  ).listen(3001);
console.log('port 3001: with rolling, session CAN be changed to browser session');

function clear(req, res, next) {
  if ('/clear' != req.url) return next();
  req.session.regenerate(function(err){});
  res.statusCode = 302;
  res.setHeader('Location', '/');
  res.end();
}
function change(req, res, next) {
  if ('/change' != req.url) return next();
  req.session.cookie.maxAge = req.session.cookie.maxAge ? null : hour;
  res.statusCode = 302;
  res.setHeader('Location', '/');
  res.end();
}
function counter(req, res) {
  req.session.count = req.session.count || 0;
  var n = req.session.count++;
  var expiration = req.session.cookie.maxAge
    ? req.session.cookie.maxAge + "msec"
    : "browser session";
  res.end('<p>Expiration: ' + expiration + '</p>'
    + '<p>Hits: ' + n + '</p>'
    + '<p><a href="/clear">clear session</a></p>'
    + (req.session.cookie.maxAge
        ? '<p><a href="/change">Change to Browser Session</a></p>'
        : '<p><a href="/change">Change to maxAge Session</a></p>'));
}
