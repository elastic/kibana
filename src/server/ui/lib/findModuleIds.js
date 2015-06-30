var _ = require('lodash');
var join = require('path').join;
var basename = require('path').basename;
var readdir = require('fs').readdirSync;
var stat = require('fs').statSync;
var exists = require('fs').existsSync;
var assetsDir = require('../assetsDir');

function hidden(name) {
  return name[0] !== '.' && name[0] !== '_';
}

function scan(type) {
  var dir = join(assetsDir, type);

  return readdir(dir)
  .filter(hidden)
  .map(function (filename) {
    var path = join(dir, filename);
    var name = basename(filename, '.js');

    if (!stat(path).isDirectory()) {
      return type + '/' + name;
    }

    if (exists(join(path, 'index.js'))) {
      return type + '/' + name + '/index';
    }

    if (exists(join(path, name + '.js'))) {
      return type + '/' + name + '/' + name;
    }

    throw new Error('unable to find index of module ' + type + '/' + name);
  });
}

module.exports = function () {
  return {
    directives: scan('directives'),
    filters: scan('filters')
  };
};
