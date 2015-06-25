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

/**
 * Extend the KbnServer outside of the constraits of a plugin. This allows access
 * to APIs that are not exposed (intentionally) to the plugins and should only
 * be used when the code will be kept up to date with Kibana.
 *
 * @param {...function} - functions that should be called to mixin functionality.
 *                         They are called with the arguments (kibana, server, config)
 *                         and can return a promise to delay execution of the next mixin
 * @return {Promise} - promise that is resolved when the final mixin completes.
 */
KbnServer.prototype.mixin = function (/* ...fns */) {
  var fns = _.toArray(arguments);
  var self = this;
  var server = self.server;

  return Promise.each(fns, function (fn) {
    return fn(self, server, server.config && server.config());
  })
  // clear the return value
  .then(_.noop);
};

/**
 * Tell the server to listen for incoming requests.
 *
 * @return {Promise} resolved with the server once it is listening
 */
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

// if this module was called from the command line, go ahead and start listening
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
