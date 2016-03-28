var purge = require('./purge');
var Promises = require('bluebird');
/**
 * Install a fresh copy?
 * @param {boolean} fresh Install a fresh copy or not 
 * @param {stirng} dest description
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
module.exports = function (fresh, dest, cb) {
  return Promises.resolve(fresh && purge(dest) || dest)
  .then(function () {
    return dest; 
  }).nodeify(cb); 
};
