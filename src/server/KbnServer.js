'use strict';

let _ = require('lodash');
let EventEmitter = require('events').EventEmitter;
let promify = require('bluebird').promisify;
let resolve = require('bluebird').resolve;
let Hapi = require('hapi');

let rootDir = require('../utils/fromRoot')('.');
let pkg = require('../utils/closestPackageJson').getSync();

module.exports = class KbnServer extends EventEmitter {
  constructor(settings) {
    super();

    this.name = pkg.name;
    this.version = pkg.version;
    this.build = pkg.build || false;
    this.rootDir = rootDir;
    this.server = new Hapi.Server();
    this.settings = settings;

    this.ready = _.constant(this.mixin(
      require('./config/setup'),
      require('./http'),
      require('./logging'),
      require('./status'), // sets this.status
      require('./plugins'), // sets this.plugins
      require('./config/complete'),
      require('./ui'), // sets this.uiExports
      require('./optimize'),
      function () {
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
  mixin(/* ...fns */) {
    let self = this;
    return resolve(_.toArray(arguments))
    .then(_.compact)
    .each(function (fn) {
      return fn.call(self, self, self.server, self.config);
    })
    .return(undefined);
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
    let server = self.server;
    let start = _.ary(promify(server.start, server), 0);

    self.ready().then(function () {
      return self.mixin(start, require('./pid'));
    })
    .then(
      function () {
        server.log('info', 'Server running at ' + server.info.uri);
        self.emit('listening');
        return server;
      },
      function (err) {
        server.log('fatal', err);
        self.emit('error', err);
      }
    );

    return this;
  }
};
