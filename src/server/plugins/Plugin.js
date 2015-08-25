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

  async readConfig() {
    let schema = await this.getConfigSchema(Joi);
    let { config } = this.kbnServer;
    config.extendSchema(this.id, schema || defaultConfigSchema);

    if (config.get([this.id, 'enabled'])) {
      return true;
    } else {
      config.removeSchema(this.id);
      return false;
    }
  }

  async init() {
    let { id, version, kbnServer } = this;
    let { config } = kbnServer;

    // setup the hapi register function and get on with it
    let register = (server, options, next) => {
      this.server = server;

      // bind the server and options to all
      // apps created by this plugin
      for (let app of this.apps) {
        app.getInjectedVars = _.partial(app.getInjectedVars, server, options);
      }

      server.log(['plugins', 'debug'], {
        tmpl: 'Initializing plugin <%= plugin.id %>',
        plugin: this
      });

      if (this.publicDir) {
        server.exposeStaticDir(`/plugins/${id}/{path*}`, this.publicDir);
      }

      this.status = kbnServer.status.create(`plugin:${this.id}`);
      server.expose('status', this.status);

      attempt(this.externalInit, [server, options], this).nodeify(next);
    };

    register.attributes = { name: id, version: version };

    await fromNode(cb => {
      kbnServer.server.register({
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
