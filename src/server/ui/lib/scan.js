var _ = require('lodash');
var join = require('path').join;
var basename = require('path').basename;
var readdir = require('fs').readdirSync;
var stat = require('fs').statSync;
var exists = require('fs').existsSync;
var assetsDir = require('../assets').root;

function hidden(name) {
  return name[0] === '.' || name[0] === '_';
}

function scan(type, ignoreDirs) {
  var dir = join(assetsDir, type);

  return _(readdir(dir))
  .reject(hidden)
  .map(function (filename) {
    var path = join(dir, filename);
    var name = basename(filename, '.js');

    if (!stat(path).isDirectory()) {
      return `${type}/${name}`;
    }

    if (ignoreDirs) {
      return null;
    }

    var options = [
      'index.js',
      name + '.js',
      'index.less',
      name + '.less'
    ];

    while (options.length) {
      var index = options.shift();
      if (exists(join(path, index))) {
        return `${type}/${name}/${index}`;
      }
    }

    throw new Error(`unable to find index of module ${type}/${name}`);
  })
  .compact()
  .value();
}

module.exports = scan;
