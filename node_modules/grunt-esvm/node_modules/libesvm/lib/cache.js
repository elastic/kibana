var cache = module.exports;
var fs = require('fs');
var Promise = require('bluebird');
var readFileAsync = Promise.promisify(fs.readFile);
var writeFileAsync = Promise.promisify(fs.writeFile);
var os = require('os');
var join = require('path').join;

cache.data = {};
cache.source = join(os.tmpdir(), 'libesvm.cache.json');

/**
 * Set a value in the cache with a ttl
 * @param {string} key The key of the value
 * @param {mixed} value The value to set
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
var set = cache.set = function (key, value, cb) {
  return cache.fetch()
    .then(function () {
      cache.data[key] = value;
    })
    .then(function () {
      return cache.save();
    })
    .nodeify(cb);
};


/**
 * Get a value from the cache
 * @param {string} key The key of the value
 * @returns {Promise}
 */
var get = cache.get = function (key, cb) {
  return cache.fetch()
    .then(function () {
      return cache.data[key];
    })
    .nodeify(cb);
};

/**
 * Fetches the data from the file
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
var fetch = cache.fetch = function (cb) {
  return readFileAsync(cache.source)
    .then(function (buffer) {
      cache.data = JSON.parse(buffer.toString('utf8'));
      return cache.data;
    })
    .catch(function (err) {
      if (err.code === 'ENOENT') {
        cache.data = {};
        return cache.data;
      }
    })
    .nodeify(cb);
};

/**
 * Save the data to disk
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
var save = cache.save = function (cb) {
  var data = JSON.stringify(cache.data || {});
  return writeFileAsync(cache.source, data).nodeify(cb);
};
