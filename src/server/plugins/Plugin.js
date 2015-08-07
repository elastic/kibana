let _ = require('lodash');
let Joi = require('joi');
let { attempt, fromNode } = require('bluebird');
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

  async init() {
    let id = this.id;
    let version = this.version;
    let kbnStatus = this.kbnServer.status;
    let server = this.kbnServer.server;
    let config = this.kbnServer.config;

    server.log(['plugins', 'debug'], {
      tmpl: 'Initializing plugin <%= plugin.id %>',
      plugin: this
    });

    if (this.publicDir) {
      server.exposeStaticDir(`/plugins/${id}/{path*}`, this.publicDir);
    }

    this.status = kbnStatus.create(`plugin:${this.id}`);

    // setup plugin config
    let schema = await this.getConfigSchema(Joi);
    config.extendSchema(id, schema || defaultConfigSchema);

    // ensure that the plugin is enabled
    let enabled = config.get([id, 'enabled']) && this.externalCondition(config);
    if (!enabled) {
      // Only change the plugin status if it wasn't set by the externalCondition
      if (this.status.state === 'uninitialized') {
        this.status.disabled();
      }

      return;
    }

    // setup the hapi register function and get on with it
    let register = (server, options, next) => {
      server.expose('status', this.status);
      attempt(this.externalInit, [server, options], this).nodeify(next);
    };

    register.attributes = { name: id, version: version };

    await fromNode(cb => {
      server.register({
        register: register,
        options: config.has(id) ? config.get(id) : null
      }, cb);
    });

    // Only change the plugin status to green if the
    // intial status has not been changed
    if (this.status.state === 'uninitialized') {
      this.status.green('Ready');
    }
  }

  toJSON() {
    return this.pkg;
  }

  toString() {
    return `${this.id}@${this.version}`;
  }
};
