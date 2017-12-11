import { once } from 'lodash';

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
 * @param {PluginDefinition} def
 * @param {PluginSpec} spec
 */
export class Plugin {
  constructor(kbnServer, spec) {
    this.kbnServer = kbnServer;
    this.spec = spec;
    this.pkg = spec.getPkg();
    this.path = spec.getPath();
    this.id = spec.getId();
    this.version = spec.getVersion();
    this.requiredIds = spec.getRequiredPluginIds() || [];
    this.externalPreInit = spec.getPreInitHandler();
    this.externalInit = spec.getInitHandler();
    this.enabled = spec.isEnabled(kbnServer.config);
    this.configPrefix = spec.getConfigPrefix();
    this.publicDir = spec.getPublicDir();

    this.preInit = once(this.preInit);
    this.init = once(this.init);
  }

  async preInit() {
    if (this.externalPreInit) {
      return await this.externalPreInit(this.kbnServer.server);
    }
  }

  async init() {
    const { id, version, kbnServer, configPrefix } = this;
    const { config } = kbnServer;

    // setup the hapi register function and get on with it
    const asyncRegister = async (server, options) => {
      this._server = server;
      this._options = options;

      server.log(['plugins', 'debug'], {
        tmpl: 'Initializing plugin <%= plugin.toString() %>',
        plugin: this
      });

      if (this.publicDir) {
        server.exposeStaticDir(`/plugins/${id}/{path*}`, this.publicDir);
      }

      // Many of the plugins are simply adding static assets to the server and we don't need
      // to track their "status". Since plugins must have an init() function to even set its status
      // we shouldn't even create a status unless the plugin can use it.
      if (this.externalInit) {
        this.status = kbnServer.status.createForPlugin(this);
        server.expose('status', this.status);
        await this.externalInit(server, options);
      }
    };

    const register = (server, options, next) => {
      asyncRegister(server, options)
        .then(() => next(), next);
    };

    register.attributes = { name: id, version: version };

    await kbnServer.server.register({
      register: register,
      options: config.has(configPrefix) ? config.get(configPrefix) : null
    });

    // Only change the plugin status to green if the
    // intial status has not been changed
    if (this.status && this.status.state === 'uninitialized') {
      this.status.green('Ready');
    }
  }

  getServer() {
    return this._server;
  }

  getOptions() {
    return this._options;
  }

  toJSON() {
    return this.pkg;
  }

  toString() {
    return `${this.id}@${this.version}`;
  }
}
