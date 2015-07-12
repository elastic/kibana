var Promise = require('bluebird');

module.exports = function alter (args, fn) {
  return Promise.all(args).then(function (args) {
    return fn(args);
  });
};