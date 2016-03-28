'use strict';

var assign = require('object-assign');
var babel = require('babel-core');
var loaderUtils = require('loader-utils');
var cache = require('./lib/fs-cache.js');
var resolveRc = require('./lib/resolve-rc.js');
var pkg = require('./package.json');
var babelrc = resolveRc(process.cwd());

var transpile = function(source, options) {
  var result = babel.transform(source, options);
  var code = result.code;
  var map = result.map;

  if (map && (!map.sourcesContent || !map.sourcesContent.length)) {
    map.sourcesContent = [source];
  }

  return {
    code: code,
    map: map,
  };
};

module.exports = function(source, inputSourceMap) {
  var result = {};
  // Handle options
  var defaultOptions = {
    inputSourceMap: inputSourceMap,
    filename: loaderUtils.getRemainingRequest(this),
    cacheIdentifier: JSON.stringify({
      'babel-loader': pkg.version,
      'babel-core': babel.version,
      babelrc: babelrc || '',
    }),
  };
  var globalOptions = this.options.babel || {};
  var loaderOptions = loaderUtils.parseQuery(this.query);
  var options = assign({}, defaultOptions, globalOptions, loaderOptions);

  if (options.sourceMap === undefined) {
    options.sourceMap = this.sourceMap;
  }

  var cacheDirectory = options.cacheDirectory;
  var cacheIdentifier = options.cacheIdentifier;

  delete options.cacheDirectory;
  delete options.cacheIdentifier;
  delete options.babelrc;

  this.cacheable();

  if (cacheDirectory) {
    var callback = this.async();
    return cache({
      directory: cacheDirectory,
      identifier: cacheIdentifier,
      source: source,
      options: options,
      transform: transpile,
    }, function(err, result) {
      if (err) { return callback(err); }
      return callback(null, result.code, result.map);
    });
  }

  result = transpile(source, options);
  this.callback(null, result.code, result.map);

};
