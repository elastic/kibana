var fs = require('fs');
/**
 * Check if file exists and return the result in cache
 *
 * @example
 * var exists = require('./helpers/fsExists')({});
 * exists('.babelrc'); // false
 */
module.exports = function(cache) {
  'use strict';

  cache = cache || {};

  return function(filename) {
    var cached = cache[filename];

    if (cached) {
      return cached;
    }

    cache[filename] = fs.existsSync(filename);

    return cache[filename];
  };
};
