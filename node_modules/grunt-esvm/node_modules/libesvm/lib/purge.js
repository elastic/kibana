var Promises = require('bluebird');
var rimraf = Promises.promisify(require('rimraf'));

module.exports = function (path) {
  return rimraf(path);
};
