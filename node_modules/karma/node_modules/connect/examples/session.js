
var connect = require('../')
  , http = require('http');

var year = 31557600000;

// large max-age, delegate expiry to the session store.
// for example with connect-redis's .ttl option.

http.createServer(connect()
  .use(connect.cookieParser())
  .use(connect.session({ secret: 'keyboard cat', cookie: { maxAge: year }}))
  .use(connect.favicon())
  .use(function(req, res, next){
    var sess = req.session;
    if (sess.views) {
      sess.views++;
      res.setHeader('Content-Type', 'text/html');
      res.write('<p>views: ' + sess.views + '</p>');
      res.write('<p>expires in: ' + (sess.cookie.maxAge / 1000) + 's</p>');
      res.end();
    } else {
      sess.views = 1;
      res.end('welcome to the session demo. refresh!');
    }
  })).listen(3007);

console.log('port 3007: 1 minute expiration demo');


// expire sessions within a minute
// /favicon.ico is ignored, and will not
// receive req.session

http.createServer(connect()
  .use(connect.cookieParser())
  .use(connect.session({ secret: 'keyboard cat', cookie: { maxAge: 60000 }}))
  .use(connect.favicon())
  .use(function(req, res, next){
    var sess = req.session;
    if (sess.views) {
      sess.views++;
      res.setHeader('Content-Type', 'text/html');
      res.write('<p>views: ' + sess.views + '</p>');
      res.write('<p>expires in: ' + (sess.cookie.maxAge / 1000) + 's</p>');
      res.end();
    } else {
      sess.views = 1;
      res.end('welcome to the session demo. refresh!');
    }
  })).listen(3006);

console.log('port 3006: 1 minute expiration demo');

// $ npm install connect-redis

try {
  var RedisStore = require('connect-redis')(connect);
  http.createServer(connect()
    .use(connect.cookieParser())
    .use(connect.session({
        secret: 'keyboard cat',
        cookie: { maxAge: 60000 * 3 }
      , store: new RedisStore
    }))
    .use(connect.favicon())
    .use(function(req, res, next){
      var sess = req.session;
      if (sess.views) {
        sess.views++;
        res.setHeader('Content-Type', 'text/html');
        res.end('<p>views: ' + sess.views + '</p>');
      } else {
        sess.views = 1;
        res.end('welcome to the redis demo. refresh!');
      }
    })).listen(3001);

  console.log('port 3001: redis example');
} catch (err) {
  console.log('\033[33m');
  console.log('failed to start the Redis example.');
  console.log('to try it install redis, start redis');
  console.log('install connect-redis, and run this');
  console.log('script again.');
  console.log('    $ redis-server');
  console.log('    $ npm install connect-redis');
  console.log('\033[0m');
}

// conditional session support by simply
// wrapping middleware with middleware.

var sess = connect.session({ secret: 'keyboard cat', cookie: { maxAge: 5000 }});

http.createServer(connect()
  .use(connect.cookieParser())
  .use(function(req, res, next){
    if ('/foo' == req.url || '/bar' == req.url) {
      sess(req, res, next);
    } else {
      next();
    }
  })
  .use(connect.favicon())
  .use(function(req, res, next){
    res.end('has session: ' + (req.session ? 'yes' : 'no'));
  })).listen(3002);

console.log('port 3002: conditional sessions');

// Session#reload() will update req.session
// without altering .maxAge

// view the page several times, and see that the
// setInterval can still gain access to new
// session data

http.createServer(connect()
  .use(connect.cookieParser())
  .use(connect.session({ secret: 'keyboard cat', cookie: { maxAge: 60000 }}))
  .use(connect.favicon())
  .use(function(req, res, next){
    var sess = req.session
      , prev;

    if (sess.views) {
      res.setHeader('Content-Type', 'text/html');
      res.write('<p>views: ' + sess.views + '</p>');
      res.write('<p>expires in: ' + (sess.cookie.maxAge / 1000) + 's</p>');
      sess.views++;
      res.end();
    } else {
      sess.views = 1;
      setInterval(function(){
        sess.reload(function(){
          console.log();
          if (prev) console.log('previous views %d, now %d', prev, req.session.views);
          console.log('time remaining until expiry: %ds', (req.session.cookie.maxAge / 1000));
          prev = req.session.views;
        });
      }, 3000);
      res.end('welcome to the session demo. refresh!');
    }
  })).listen(3003);

console.log('port 3003: Session#reload() demo');

// by default sessions
// last the duration of
// a user-agent's own session,
// aka while the browser is open.

http.createServer(connect()
  .use(connect.cookieParser())
  .use(connect.session({ secret: 'keyboard cat' }))
  .use(connect.favicon())
  .use(function(req, res, next){
    var sess = req.session;
    if (sess.views) {
      res.setHeader('Content-Type', 'text/html');
      res.write('<p>views: ' + sess.views + '</p>');
      sess.views++;
      res.end();
    } else {
      sess.views = 1;
      res.end('welcome to the browser session demo. refresh!');
    }
  })).listen(3004);

console.log('port 3004: browser-session length sessions');

// persistence example, enter your name!

http.createServer(connect()
  .use(connect.bodyParser())
  .use(connect.cookieParser())
  .use(connect.session({ secret: 'keyboard cat' }))
  .use(connect.favicon())
  .use(function(req, res, next){
    if ('POST' != req.method) return next();
    req.session.name = req.body.name;
    res.statusCode = 302;
    res.setHeader('Location', '/');
    res.end();
  })
  .use(function(req, res, next){
    var sess = req.session;
    res.setHeader('Content-Type', 'text/html');
    if (sess.name) res.write('<p>Hey ' + sess.name + '!</p>');
    else res.write('<p>Enter a username:</p>');
    res.end('<form action="/" method="post">'
      + '<input type="type" name="name" />'
      + '<input type="submit" value="Save" />'
      + '</form>');
  })).listen(3005);

console.log('port 3005: browser-session length sessions persistence example');
