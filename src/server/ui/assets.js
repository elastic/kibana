var fromRoot = require('../utils/fromRoot');
var readdir = require('fs').readdirSync;
var stat = require('fs').statSync;
var join = require('path').join;

exports.root = fromRoot('src/ui');
exports.files = {};
exports.dirs = {};

readdir(exports.root).forEach(function (name) {
  if (name.charAt(0) === '.') return;

  var path = join(exports.root, name);
  var isDir = stat(path).isDirectory();
  exports[isDir ? 'dirs' : 'files'][name] = path;
});
