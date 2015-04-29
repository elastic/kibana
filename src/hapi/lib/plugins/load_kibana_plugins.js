var registerPlugins = require('./register_plugins');
var requirePlugins = require('./require_plugins');
var logging = require('../logging/');
module.exports = function (externalPlugins) {
  var plugins = requirePlugins().concat(externalPlugins);
  return logging(this).then(function (server) {
    registerPlugins(server, plugins);
  });
};
