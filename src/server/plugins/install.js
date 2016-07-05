import { includes } from 'lodash';

export default async function (kbnServer, server, config) {

  if (!config.get('plugins.install')) {
    server.log(['info'], 'Plugin installation disabled.');
    return [];
  }

  const installContext = {};
  const { plugins } = kbnServer;


  const path = [];

  const initialize = async function (id) {
    const plugin = plugins.byId[id];

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

    await plugin.install(installContext);
    path.pop();
  };

  const collection = plugins.toArray();

  for (let { id } of collection) {
    await initialize(id);
  }
};
