import { includes, keys } from 'lodash';
module.exports = async function (kbnServer, server, config) {

  if (!config.get('plugins.initialize')) {
    server.log(['info'], 'Plugin initialization disabled.');
    return [];
  }

  let { plugins } = kbnServer;

  // extend plugin apis with additional context
  plugins.getPluginApis().forEach(api => {

    Object.defineProperty(api, 'uiExports', {
      value: kbnServer.uiExports
    });

  });


  let path = [];
  const initialize = async function (id) {
    let plugin = plugins.byId[id];

    if (includes(path, id)) {
      throw new Error(`circular dependencies found: "${path.concat(id).join(' -> ')}"`);
    }

    path.push(id);

    for (let reqId of plugin.requiredIds) {
      if (!plugins.byId[reqId]) {
        throw new Error(`Unmet requirement "${reqId}" for plugin "${id}"`);
      }

      await initialize(reqId);
    }

    await plugin.init();
    path.pop();
  };

  for (let {id} of plugins) {
    await initialize(id);
  }
};
