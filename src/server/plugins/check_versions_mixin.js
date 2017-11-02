import { isVersionCompatible } from './lib';

/**
 *  Check that plugin versions match Kibana version, otherwise
 *  disable them
 *
 *  @param  {KbnServer} kbnServer
 *  @param  {Hapi.Server} server
 *  @return {Promise<undefined>}
 */
export function checkVersionsMixin(kbnServer, server) {
  // because a plugin pack can contain more than one actual plugin, (for example x-pack)
  // we make sure that the warning messages are unique
  const warningMessages = new Set();
  const plugins = kbnServer.plugins;
  const kibanaVersion = kbnServer.version;

  for (const plugin of plugins) {
    const name = plugin.id;
    const pluginVersion = plugin.kibanaVersion;

    if (!isVersionCompatible(pluginVersion, kibanaVersion)) {
      const message = `Plugin "${name}" was disabled because it expected Kibana version "${pluginVersion}", and found "${kibanaVersion}".`;
      warningMessages.add(message);
      plugins.disable(plugin);
    }
  }

  for (const message of warningMessages) {
    server.log(['warning'], message);
  }
}
