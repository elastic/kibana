var path = require('path');
var join = path.join;
var glob = require('glob');
var Promise = require('bluebird');

module.exports = function (globPath) {
  globPath = globPath || join( __dirname, '..', 'plugins', '*', 'index.js');
  return glob.sync(globPath).map(function (file) {
    var module = require(file);
    var regex = new RegExp('([^' + path.sep + ']+)' + path.sep + 'index.js');
    var matches = file.match(regex);
    if (!module.name && matches) {
      module.name = matches[1];
    }
    return module;
  });
};
