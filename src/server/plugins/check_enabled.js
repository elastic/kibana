import toPath from 'lodash/internal/toPath';

export default async function (kbnServer, server, config) {
  const { plugins } = kbnServer;

  for (let plugin of plugins) {
    const enabledInConfig = config.get([...toPath(plugin.configPrefix), 'enabled']);

    if (!enabledInConfig) {
      plugins.disable(plugin);
    }
  }

  return;
};
