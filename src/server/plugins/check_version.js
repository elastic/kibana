import { cleanVersion, versionSatisfies } from '../../utils/version';
import { get } from 'lodash';

function compatibleWithKibana(kbnServer, plugin) {
  //core plugins have a version of 'kibana' and are always compatible
  if (plugin.kibanaVersion === 'kibana') return true;

  const pluginKibanaVersion = cleanVersion(plugin.kibanaVersion);
  const kibanaVersion = cleanVersion(kbnServer.version);

  return versionSatisfies(pluginKibanaVersion, kibanaVersion);
}

export default async function (kbnServer, server) {
  //because a plugin pack can contain more than one actual plugin, (for example x-pack)
  //we make sure that the warning messages are unique
  const warningMessages = new Set();
  const plugins = kbnServer.plugins;

  for (const plugin of plugins) {
    const version = plugin.kibanaVersion;
    const name = get(plugin, 'pkg.name');

    if (!compatibleWithKibana(kbnServer, plugin)) {
      const message = `Plugin "${name}" was disabled because it expected Kibana version "${version}", and found "${kbnServer.version}".`;
      warningMessages.add(message);
      plugins.disable(plugin);
    }
  }

  for (const message of warningMessages) {
    server.log(['warning'], message);
  }

  return;
};
