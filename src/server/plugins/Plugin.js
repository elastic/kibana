var _ = require('lodash');
var inherits = require('util').inherits;
var Joi = require('joi');
var Promise = require('bluebird');
var join = require('path').join;

function Plugin(kibana, path, package, opts) {
  this._kibana = kibana;
  this.package = package;
  this.path = path;

  this.name = opts.name || package.name;
  this.version = opts.version || package.version;
  this.publicDir = _.get(opts, 'publicDir', join(path, 'public'));
  this.externalInit = opts.init || _.noop;
  this.getConfig = opts.config || _.noop;

  kibana.feExports.readExports(this, opts.exports);

  var readyCb;
  var readyPromise = Promise.fromNode(function (cb) { readyCb = cb; });
  this.ready = _.constant(readyPromise);
}

Plugin.scoped = function (kibana, path, package) {
  function ScopedPlugin(opts) {
    ScopedPlugin.super_.call(this, kibana, path, package, opts || {});
  }
  inherits(ScopedPlugin, Plugin);
  return ScopedPlugin;
};

Plugin.prototype.init = function () {
  var self = this;
  var name = self.name;
  var version = self.version;
  var server = this._kibana.server;
  var status = this._kibana.status;

  var config = server.config();

  return Promise.try(function () {
    return self.getConfig(Joi);
  })
  .then(function (schema) {
    if (schema) config.extendSchema(name, schema);
  })
  .then(function () {
    return status.decoratePlugin(self);
  })
  .then(function () {

    var register = function (server, options, next) {
      server.expose('plugin', self);
      Promise.try(self.externalInit, [server, options], self).nodeify(next);
    };

    register.attributes = { name: name, version: version };

    return Promise.fromNode(function (cb) {
      server.register({
        register: register,
        options: config.has(name) ? config.get(name) : null
      }, cb);
    });

  })
  .then(function () {
    // Only change the plugin status to green if the
    // intial status has not been updated
    if (self.status.state === undefined) {
      self.status.green('Ready');
    }
  });
};

module.exports = Plugin;
