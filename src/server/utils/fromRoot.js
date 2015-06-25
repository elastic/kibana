var dirname = require('path').dirname;
var join = require('path').join;
var root = dirname(require('./closestPackageJson').findSync());

module.exports = function (dir) {
  return join(root, dir);
};
