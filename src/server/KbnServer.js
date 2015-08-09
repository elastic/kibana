let _ = require('lodash');
let { EventEmitter } = require('events');
let { promisify, resolve, fromNode } = require('bluebird');
let Hapi = require('hapi');

let utils = require('requirefrom')('src/utils');
let rootDir = utils('fromRoot')('.');
let pkg = utils('packageJson');

module.exports = class KbnServer extends EventEmitter {
  constructor(settings) {
    super();

    this.name = pkg.name;
    this.version = pkg.version;
    this.build = pkg.build || false;
    this.rootDir = rootDir;
    this.settings = settings || {};

    this.ready = _.constant(this.mixin(
      require('./config/setup'), // sets this.config, reads this.settings
      require('./http'), // sets this.server
      require('./logging'),
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
          this.listen();
        }
      }
    ));

    this.listen = _.once(this.listen);
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
    fns = _.compact(_.flatten(fns));

    try {
      for (let fn of fns) {
        await fn.call(this, this, this.server, this.config);
      }
    } catch (err) {
      if (this.server) this.server.log('fatal', err);
      else console.error('FATAL', err);

      this.emit('error', err);
      await this.close();
      throw err;
    }

  }

  /**
   * Tell the server to listen for incoming requests, or get
   * a promise that will be resolved once the server is listening.
   *
   * Calling this function has no effect, unless the "server.autoListen"
   * is set to false.
   *
   * @return undefined
   */
  listen() {
    let self = this;

    return self.ready()
    .then(function () {
      return self.mixin(
        function () {
          return fromNode(_.bindKey(self.server, 'start'));
        },
        require('./pid')
      );
    })
    .then(function () {
      self.server.log(['listening', 'info'], 'Server running at ' + self.server.info.uri);
      self.emit('listening');
      return self.server;
    });
  }

  close() {
    return fromNode(_.bindKey(this.server, 'stop'));
  }
};
