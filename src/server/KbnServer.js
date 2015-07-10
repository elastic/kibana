'use strict';

let _ = require('lodash');
let EventEmitter = require('events').EventEmitter;
let promify = require('bluebird').promisify;
let each = require('bluebird').each;
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
    this.settings = settings || {};

    this.server = new Hapi.Server();

    require('./config')(this, this.server);
    let config = this.server.config();

    this.ready = _.constant(this.mixin(
      require('./logging'),
      require('./http'),
      require('./status'), // sets this.status
      require('./plugins'), // sets this.plugins
      require('./ui'), // sets this.uiExports
      require('./optimize')
    ));

    this.listen = _.once(this.listen);
    if (config.get('server.autoListen')) {
      this.listen();
    }
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
    let fns = _.compact(_.toArray(arguments));
    let self = this;
    let server = self.server;

    return each(fns, function (fn) {
      return fn.call(self, self, server, server.config());
    })
    .then(_.noop); // clear the return value
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
