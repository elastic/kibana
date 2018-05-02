const pluginConfig = require('./plugin_config');
const tasks = require('./tasks');

module.exports = function run(name, options) {
  const action = tasks[name];
  if (!action) {
    throw new Error('Invalid task: "' + name + '"');
  }

  const plugin = pluginConfig();
  return action(plugin, run, options);
};
