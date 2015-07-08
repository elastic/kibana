'use strict';

let _ = require('lodash');
let inherits = require('util').inherits;
let Joi = require('joi');
let Promise = require('bluebird');
let join = require('path').join;

module.exports = class Plugin {
  constructor(kbnServer, path, pkg, opts) {
    this.kbnServer = kbnServer;
    this.pkg = pkg;
    this.path = path;

    this.id = opts.id || pkg.name;
    this.uiExportSpecs = opts.uiExports || {};
    this.requiredIds = opts.require || [];
    this.version = opts.version || pkg.version;
    this.publicDir = _.get(opts, 'publicDir', join(path, 'public'));
    this.externalInit = opts.init || _.noop;
    this.getConfig = opts.config || _.noop;
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
    let server = self.kbnServer.server;
    let status = self.kbnServer.status;

    let config = server.config();
    server.log(['plugins', 'debug'], {
      tmpl: 'Initializing plugin <%= plugin.id %>',
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

      let register = function (server, options, next) {
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
  }

  toJSON() {
    return this.pkg;
  }

  toString() {
    return `${this.id}@${this.version}`;
  }
};
