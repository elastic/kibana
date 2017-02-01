import { includes } from 'lodash';

export default async (plugins) => {
  const path = [];

  const initialize = async function (id, fn) {
    const plugin = plugins.byId[id];

    if (includes(path, id)) {
      throw new Error(`circular dependencies found: "${path.concat(id).join(' -> ')}"`);
    }

    path.push(id);

    for (const reqId of plugin.requiredIds) {
      if (!plugins.byId[reqId]) {
        throw new Error(`Unmet requirement "${reqId}" for plugin "${id}"`);
      }

      await initialize(reqId, fn);
    }

    await plugin[fn]();
    path.pop();
  };

  const collection = plugins.toArray();
  for (const { id } of collection) {
    await initialize(id, 'preInit');
  }

  for (const { id } of collection) {
    await initialize(id, 'init');
  }
};
