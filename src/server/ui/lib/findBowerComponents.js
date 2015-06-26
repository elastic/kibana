var join = require('path').join;
var exists = require('fs').existsSync;
var relative = require('path').relative;

module.exports = function (start, within) {
  var dir = start;
  var bowerPath = join(dir, 'bower_components');

  while (!exists(bowerPath)) {
    var prev = dir;
    dir = join(dir, '..');
    bowerPath = join(dir, 'bower_components');

    if (dir === prev || relative(within, dir).slice(0, 2) === '..') {
      throw new Error('unable to find bower_components');
    }
  }

  return bowerPath;
};
