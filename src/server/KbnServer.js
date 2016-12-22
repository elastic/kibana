let { constant, once, compact, flatten } = require('lodash');
let { promisify, resolve, fromNode } = require('bluebird');
let Hapi = require('hapi');

let utils = require('requirefrom')('src/utils');
let rootDir = utils('fromRoot')('.');
let pkg = utils('packageJson');

module.exports = class KbnServer {
  constructor(settings) {
    this.name = pkg.name;
    this.version = pkg.version;
    this.build = pkg.build || false;
    this.rootDir = rootDir;
    this.settings = settings || {};

    this.ready = constant(this.mixin(
      require('./config/setup'), // sets this.config, reads this.settings
      require('./http'), // sets this.server
      require('./logging'),
      require('./warnings'),
      require('./status'),

      // find plugins and set this.plugins
      require('./plugins/scan'),

      // tell the config we are done loading plugins
      require('./config/complete'),

      // setup this.uiExports and this.bundles
      require('../ui'),

      // ensure that all bundles are built, or that the
      // lazy bundle server is running
      require('../optimize'),

      // finally, initialize the plugins
      require('./plugins/initialize'),

      () => {
        if (this.config.get('server.autoListen')) {
          this.ready = constant(resolve());
          return this.listen();
        }
      }
    ));

    this.listen = once(this.listen);
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
  async mixin(...fns) {
    for (let fn of compact(flatten(fns))) {
      await fn.call(this, this, this.server, this.config);
    }
  }

  /**
   * Tell the server to listen for incoming requests, or get
   * a promise that will be resolved once the server is listening.
   *
   * @return undefined
   */
  async listen() {
    let { server, config } = this;

    await this.ready();
    await fromNode(cb => server.start(cb));
    await require('./pid')(this, server, config);

    server.log(['listening', 'info'], 'Server running at ' + server.info.uri);
    return server;
  }

  async close() {
    await fromNode(cb => this.server.stop(cb));
  }

  async inject(opts) {
    if (!this.server) await this.ready();

    return await fromNode(cb => {
      try {
        this.server.inject(opts, (resp) => {
          cb(null, resp);
        });
      } catch (err) {
        cb(err);
      }
    });
  }
};
