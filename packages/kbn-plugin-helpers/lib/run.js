var pluginConfig = require('./plugin_config');

module.exports = function run(name) {
  var action = require('../tasks/' + name);
  return function () {
    // call the action function with the plugin, then all
    // renaining arguments from commander
    var plugin = pluginConfig();
    action.apply(null, [plugin, run].concat([].slice.apply(arguments)));
  };
};
