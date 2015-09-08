let _ = require('lodash');
let Joi = require('joi');
let Promise = require('bluebird');
let { resolve } = require('path');
let { inherits } = require('util');

const defaultConfigSchema = Joi.object({
  enabled: Joi.boolean().default(true)
}).default();

module.exports = class Plugin {
  constructor(kbnServer, path, pkg, opts) {
    this.kbnServer = kbnServer;
    this.pkg = pkg;
    this.path = path;

    this.id = opts.id || pkg.name;
    this.uiExportsSpecs = opts.uiExports || {};
    this.requiredIds = opts.require || [];
    this.version = opts.version || pkg.version;
    this.publicDir = opts.publicDir !== false ? resolve(path, 'public') : null;
    this.externalCondition = opts.initCondition || _.constant(true);
    this.externalInit = opts.init || _.noop;
    this.getConfigSchema = opts.config || _.noop;
    this.init = _.once(this.init);
  }

  static scoped(kbnServer, path, pkg) {
    return class ScopedPlugin extends Plugin {
      constructor(opts) {
        super(kbnServer, path, pkg, opts || {});
      }
    };
  }

  init() {
    let self = this;

    let id = self.id;
    let version = self.version;
    let kbnStatus = self.kbnServer.status;
    let server = self.kbnServer.server;
    let config = self.kbnServer.config;

    server.log(['plugins', 'debug'], {
      tmpl: 'Initializing plugin <%= plugin.id %>',
      plugin: self
    });

    self.status = kbnStatus.create(`plugin:${self.id}`);
    return Promise.try(function () {
      return self.getConfigSchema(Joi);
    })
    .then(function (schema) {
      if (schema) config.extendSchema(id, schema);
      else config.extendSchema(id, defaultConfigSchema);
    })
    .then(function () {
      if (config.get([id, 'enabled'])) {
        return self.externalCondition(config);
      }
    })
    .then(function (enabled) {
      if (!enabled) {
        // Only change the plugin status if it wasn't set by the externalCondition
        if (self.status.state === 'uninitialized') {
          self.status.disabled();
        }
        return;
      }

      let register = function (server, options, next) {
        server.expose('status', self.status);
        Promise.try(self.externalInit, [server, options], self).nodeify(next);
      };

      register.attributes = { name: id, version: version };

      return Promise.fromNode(function (cb) {
        server.register({
          register: register,
          options: config.has(id) ? config.get(id) : null
        }, cb);
      })
      .then(function () {
        // Only change the plugin status to green if the
        // intial status has not been updated
        if (self.status.state === 'uninitialized') {
          self.status.green('Ready');
        }
      });
    });
  }

  toJSON() {
    return this.pkg;
  }

  toString() {
    return `${this.id}@${this.version}`;
  }
};
