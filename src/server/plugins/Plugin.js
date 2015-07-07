var _ = require('lodash');
var inherits = require('util').inherits;
var Joi = require('joi');
var Promise = require('bluebird');
var join = require('path').join;

function Plugin(kbnServer, path, package, opts) {
  this.kbnServer = kbnServer;
  this.package = package;
  this.path = path;

  this.id = opts.id || package.name;
  this.uiExportSpecs = opts.uiExports || {};
  this.requiredIds = opts.require || [];
  this.version = opts.version || package.version;
  this.publicDir = _.get(opts, 'publicDir', join(path, 'public'));
  this.externalInit = opts.init || _.noop;
  this.getConfig = opts.config || _.noop;
  this.init = _.once(this.init);
}

Plugin.scoped = function (kbnServer, path, package) {
  function ScopedPlugin(opts) {
    ScopedPlugin.super_.call(this, kbnServer, path, package, opts || {});
  }
  inherits(ScopedPlugin, Plugin);
  return ScopedPlugin;
};

Plugin.prototype.init = function () {
  var self = this;

  var id = self.id;
  var version = self.version;
  var server = self.kbnServer.server;
  var status = self.kbnServer.status;

  var config = server.config();
  server.log(['plugin', 'init', 'debug'], {
    message: 'initializing plugin <%= plugin.id %>',
    plugin: self
  });

  return Promise.try(function () {
    return self.getConfig(Joi);
  })
  .then(function (schema) {
    if (schema) config.extendSchema(id, schema);
  })
  .then(function () {
    return status.decoratePlugin(self);
  })
  .then(function () {
    return self.kbnServer.uiExports.consumePlugin(self);
  })
  .then(function () {

    var register = function (server, options, next) {

      Promise.try(self.externalInit, [server, options], self).nodeify(next);
    };

    register.attributes = { name: id, version: version };

    return Promise.fromNode(function (cb) {
      server.register({
        register: register,
        options: config.has(id) ? config.get(id) : null
      }, cb);
    });

  })
  .then(function () {
    // Only change the plugin status to green if the
    // intial status has not been updated
    if (self.status.state === 'uninitialized') {
      self.status.green('Ready');
    }
  });
};

Plugin.prototype.toString = function () {
  return `${this.id}@${this.version}`;
};

module.exports = Plugin;
