var _ = require('lodash');
var Promise = require('bluebird');
var Hapi = require('hapi');
var dirname = require('path').dirname;

var rootDir = require('./utils/fromRoot')('.');
var package = require('./utils/closestPackageJson').getSync();

function KbnServer(settings) {
  this.name = package.name;
  this.version = package.version;
  this.build = package.build || false;
  this.rootDir = rootDir;
  this.server = new Hapi.Server();
  this.settings = settings || {};
  this.ready = _.constant(this.mixin(
    require('./config'),
    require('./logging'),
    require('./http'),
    require('./ui'),
    require('./status'),
    require('./plugins')
  ));
}

KbnServer.prototype.mixin = function () {
  var self = this;
  var server = self.server;

  return Promise.each(_.toArray(arguments), function (fn) {
    return fn(self, server, server.config && server.config());
  })
  .then(_.noop);
};

KbnServer.prototype.listen = function () {
  var self = this;
  var server = self.server;
  var start = _.ary(Promise.promisify(server.start, server), 0);

  return self.ready()
  .then(function () {
    return self.mixin(start, require('./pid'));
  })
  .then(
    function () {
      server.log('server', 'Server running at ' + server.info.uri);
      return server;
    },
    function (err) {
      server.log('fatal', err);
      throw err;
    }
  );
};

if (require.main === module) {
  (new KbnServer())
  .listen()
  .catch(function (err) {
    console.log(err.stack);
    process.exit(1);
  });
} else {
  module.exports = KbnServer;
}
