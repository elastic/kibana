/*!
 * Connect - favicon
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var path = require('path');
var serveFavicon = require('serve-favicon');

var defaultPath = path.join(__dirname, '..', 'public', 'favicon.ico');

/**
 * Favicon:
 *
 * By default serves the connect favicon, or the favicon
 * located by the given `path`.
 *
 * See [serve-favicon](https://github.com/expressjs/serve-favicon)
 *
 * @param {String|Buffer} path
 * @param {Object} options
 * @return {Function}
 * @api public
 */

module.exports = function favicon(path, options){
  path = path || defaultPath;
  return serveFavicon(path, options);
};
