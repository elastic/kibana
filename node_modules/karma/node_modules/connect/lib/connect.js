/*!
 * Connect
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var deprecate = require('depd')('connect');
var EventEmitter = require('events').EventEmitter
  , proto = require('./proto')
  , utils = require('./utils')
  , path = require('path')
  , basename = path.basename
  , fs = require('fs');

// node patches

require('./patch');

// expose createServer() as the module

exports = module.exports = createServer;

/**
 * Framework version.
 */

exports.version = require('../package').version;

/**
 * Expose mime module.
 */

exports.mime = require('./middleware/static').mime;

/**
 * Expose the prototype.
 */

exports.proto = proto;

/**
 * Auto-load middleware getters.
 */

exports.middleware = {};

/**
 * Expose utilities.
 */

exports.utils = utils;

/**
 * Create a new connect server.
 *
 * @return {Function}
 * @api public
 */

function createServer() {
  function app(req, res, next){ app.handle(req, res, next); }
  utils.merge(app, proto);
  utils.merge(app, EventEmitter.prototype);
  app.route = '/';
  app.stack = [];

  if (arguments.length !== 0) {
    deprecate('connect(middleware): use app.use(middleware) instead');
  }

  for (var i = 0; i < arguments.length; ++i) {
    app.use(arguments[i]);
  }

  return app;
};

/**
 * Support old `.createServer()` method.
 */

createServer.createServer = deprecate.function(createServer,
  'createServer(): use connect() instead');

/**
 * Auto-load bundled middleware with getters.
 */

fs.readdirSync(__dirname + '/middleware').forEach(function(filename){
  if (!/\.js$/.test(filename)) return;
  var name = basename(filename, '.js');
  function load(){ return require('./middleware/' + name); }
  exports.middleware.__defineGetter__(name, load);
  exports.__defineGetter__(name, load);
});
