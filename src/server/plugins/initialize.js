module.exports = async function (kbnServer, server, config) {
  let { includes, keys } = require('lodash');

  if (!config.get('plugins.initialize')) {
    server.log(['info'], 'Plugin initialization disabled.');
    return [];
  }

  let { plugins } = kbnServer;
  let enabledPlugins = {};

  // setup config and filter out disabled plugins
  for (let plugin of plugins) {
    if (config.get([plugin.id, 'enabled'])) {
      enabledPlugins[plugin.id] = plugin;
    }
  }


  let path = [];
  let initialize = async id => {
    let plugin = enabledPlugins[id];

    if (includes(path, id)) {
      throw new Error(`circular dependencies found: "${path.concat(id).join(' -> ')}"`);
    }

    path.push(id);


    for (let reqId of plugin.requiredIds) {
      if (!enabledPlugins[reqId]) {
        if (plugins.byId[reqId]) {
          throw new Error(`Requirement "${reqId}" for plugin "${plugin.id}" is disabled.`);
        } else {
          throw new Error(`Unmet requirement "${reqId}" for plugin "${plugin.id}"`);
        }
      }
      await initialize(reqId);
    }

    await plugin.init();

    path.pop();
  };

  for (let id of keys(enabledPlugins)) await initialize(id);
};
