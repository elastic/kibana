import _ from 'lodash';
import toPath from 'lodash/internal/toPath';
import Joi from 'joi';
import Bluebird, { attempt, fromNode } from 'bluebird';
import { basename, resolve } from 'path';
import { inherits } from 'util';

const extendInitFns = Symbol('extend plugin initialization');

const defaultConfigSchema = Joi.object({
  enabled: Joi.boolean().default(true)
}).default();

/**
 * The server plugin class, used to extend the server
 * and add custom behavior. A "scoped" plugin class is
 * created by the PluginApi class and provided to plugin
 * providers that automatically binds all but the `opts`
 * arguments.
 *
 * @class Plugin
 * @param {KbnServer} kbnServer - the KbnServer this plugin
 *                              belongs to.
 * @param {String} path - the path from which the plugin hails
 * @param {Object} pkg - the value of package.json for the plugin
 * @param {Objects} opts - the options for this plugin
 * @param {String} [opts.id=pkg.name] - the id for this plugin.
 * @param {Object} [opts.uiExports] - a mapping of UiExport types
 *                                  to UI modules or metadata about
 *                                  the UI module
 * @param {Array} [opts.require] - the other plugins that this plugin
 *                               requires. These plugins must exist and
 *                               be enabled for this plugin to function.
 *                               The require'd plugins will also be
 *                               initialized first, in order to make sure
 *                               that dependencies provided by these plugins
 *                               are available
 * @param {String} [opts.version=pkg.version] - the version of this plugin
 * @param {Function} [opts.init] - A function that will be called to initialize
 *                               this plugin at the appropriate time.
 * @param {Function} [opts.configPrefix=this.id] - The prefix to use for configuration
 *                               values in the main configuration service
 * @param {Function} [opts.config] - A function that produces a configuration
 *                                 schema using Joi, which is passed as its
 *                                 first argument.
 * @param {String|False} [opts.publicDir=path + '/public']
 *    - the public directory for this plugin. The final directory must
 *    have the name "public", though it can be located somewhere besides
 *    the root of the plugin. Set this to false to disable exposure of a
 *    public directory
 */
module.exports = class Plugin {
  constructor(kbnServer, path, pkg, opts) {
    this.kbnServer = kbnServer;
    this.pkg = pkg;
    this.path = path;

    this.id = opts.id || pkg.name;
    this.uiExportsSpecs = opts.uiExports || {};
    this.requiredIds = opts.require || [];
    this.version = opts.version || pkg.version;
    this.externalPreInit = opts.preInit || _.noop;
    this.externalInit = opts.init || _.noop;
    this.configPrefix = opts.configPrefix || this.id;
    this.getConfigSchema = opts.config || _.noop;
    this.preInit = _.once(this.preInit);
    this.init = _.once(this.init);
    this[extendInitFns] = [];

    if (opts.publicDir === false) {
      this.publicDir = null;
    }
    else if (!opts.publicDir) {
      this.publicDir = resolve(this.path, 'public');
    }
    else {
      this.publicDir = opts.publicDir;
      if (basename(this.publicDir) !== 'public') {
        throw new Error(`publicDir for plugin ${this.id} must end with a "public" directory.`);
      }
    }
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
    config.extendSchema(this.configPrefix, schema || defaultConfigSchema);

    if (config.get([...toPath(this.configPrefix), 'enabled'])) {
      return true;
    } else {
      config.removeSchema(this.configPrefix);
      return false;
    }
  }

  async preInit() {
    return await this.externalPreInit(this.kbnServer.server);
  }

  async init() {
    let { id, version, kbnServer, configPrefix } = this;
    let { config } = kbnServer;

    // setup the hapi register function and get on with it
    const asyncRegister = async (server, options) => {
      this.server = server;

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

      this.status = kbnServer.status.createForPlugin(this);
      server.expose('status', this.status);

      return await attempt(this.externalInit, [server, options], this);
    };

    const register = (server, options, next) => {
      Bluebird.resolve(asyncRegister(server, options)).nodeify(next);
    };

    register.attributes = { name: id, version: version };

    await fromNode(cb => {
      kbnServer.server.register({
        register: register,
        options: config.has(configPrefix) ? config.get(configPrefix) : null
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
