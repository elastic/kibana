var RoutingProxy, app, auth, express, http, path, proxy;

RoutingProxy = require('http-proxy').RoutingProxy;
express = require('express');
http = require('http');
path = require('path');

app = express();
proxy = new RoutingProxy();

auth = function(username, password, callback) {
  var fakeUser;
  console.log(username + ":" + password);
  fakeUser = {
    id: '123123'
  };
  callback(null, fakeUser);
};

app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  app.set('elasticsearch-host', process.env.ES_HOST || 'localhost');
  app.set('elasticsearch-port', process.env.ES_PORT || 9200);
  app.use(express["static"](path.join(__dirname, '..')));
  app.use(express.basicAuth(auth));
  app.use(app.router);
});

app.configure('development', function() {
  app.use(express.logger('dev'));
  app.use(express.errorHandler());
});

//Server the kibana interface
app.get('/', function(req, res) {
  res.sendfile('../index.html');
});

//you can protect routes using middlewares.
app.get('*', function(req, res) {
  proxy.proxyRequest(req, res, {
    host: app.get('elasticsearch-host'),
    port: app.get('elasticsearch-port')
  });
});

app.post('*', function(req, res) {
  proxy.proxyRequest(req, res, {
    host: app.get('elasticsearch-host'),
    port: app.get('elasticsearch-port')
  });
});

app.put('*', function(req, res) {
  proxy.proxyRequest(req, res, {
    host: app.get('elasticsearch-host'),
    port: app.get('elasticsearch-port')
  });
});

http.createServer(app).listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});
