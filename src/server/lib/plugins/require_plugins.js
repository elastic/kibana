var path = require('path');
var join = path.join;
var glob = require('glob');
var Promise = require('bluebird');
var checkPath = require('../config/check_path');

module.exports = function (globPath) {
  globPath = globPath || join( __dirname, '..', '..', 'plugins', '*', 'index.js');
  return glob.sync(globPath).map(function (file) {
    var module = require(file);
    var regex = new RegExp('([^' + path.sep + ']+)' + path.sep + 'index.js');
    var matches = file.match(regex);
    if (!module.name && matches) {
      module.name = matches[1];
    }

    // has a public folder?
    var publicPath = module.publicPath || join(path.dirname(file), 'public');
    if (checkPath(publicPath)) {
      module.publicPath = publicPath;
      if (!module.publicPlugins) {
        module.publicPlugins = glob.sync(join(publicPath, 'plugins', '*', 'index.js'));
        module.publicPlugins = module.publicPlugins.map(function (file) {
          console.log(publicPath);
          return file.replace(publicPath, module.name).replace(/\.js$/, '');
        });
      }
    }

    return module;
  });
};
