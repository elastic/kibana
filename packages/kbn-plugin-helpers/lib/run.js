var pluginConfig = require('./plugin_config');
var tasks = require('./tasks');

module.exports = function run(name, options) {
  var action = tasks[name];
  if (!action) throw new Error('Invalid task: "' + name + '"');

  var plugin = pluginConfig();
  action(plugin, run, options);
};
