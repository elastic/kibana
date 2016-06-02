let _ = require('lodash');
let Joi = require('joi');
let Bluebird = require('bluebird');
let { resolve } = require('path');
let { inherits } = require('util');

const extendInitFns = Symbol('extend plugin initialization');

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
    this[extendInitFns] = [];
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
    const asyncRegister = async (server, options, next) => {
      this.server = server;

      // bind the server and options to all
      // apps created by this plugin
      await Promise.all(this[extendInitFns].map(async fn => {
        await fn.call(this, server, options);
      }));

      server.log(['plugins', 'debug'], {
        tmpl: 'Initializing plugin <%= plugin.toString() %>',
        plugin: this
      });

      if (this.publicDir) {
        server.exposeStaticDir(`/plugins/${id}/{path*}`, this.publicDir);
      }

      this.status = kbnServer.status.create(this);
      server.expose('status', this.status);

      return await Bluebird.attempt(this.externalInit, [server, options], this);
    };

    const register = (server, options, next) => {
      Bluebird.resolve(asyncRegister(server, options)).nodeify(next);
    };

    register.attributes = { name: id, version: version };

    await Bluebird.fromNode(cb => {
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

  extendInit(fn) {
    this[extendInitFns].push(fn);
  }

  toJSON() {
    return this.pkg;
  }

  toString() {
    return `${this.id}@${this.version}`;
  }
};
