
/**
 * Module dependencies.
 */

var connect = require('../');

function auth(user, pass) {
  return 'tj' == user && 'tobi' == pass;
}

function authorized(req, res) {
  res.end('authorized!');
}

function hello(req, res) {
  res.end('hello! try /admin');
}

// apply globally

connect(
    connect.basicAuth(auth)
  , authorized
).listen(3000);

// apply to /admin/* only

var server = connect();

server.use('/admin', connect.basicAuth(auth));
server.use('/admin', authorized);
server.use(hello);

server.listen(3001);