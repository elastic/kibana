import { cleanVersion, versionSatisfies } from '../../utils/version';
import { get } from 'lodash';

function compatibleWithKibana(kbnServer, pluginVersion) {
  //core plugins have a version of 'kibana' and are always compatible
  if (pluginVersion === 'kibana') return true;

  const cleanPluginVersion = cleanVersion(pluginVersion);
  const kibanaVersion = cleanVersion(kbnServer.version);

  return versionSatisfies(cleanPluginVersion, kibanaVersion);
}

export default async function (kbnServer, server, config) {
  //because a plugin pack can contain more than one actual plugin, (for example x-pack)
  //we make sure that the warning messages are unique
  const warningMessages = new Set();
  const plugins = kbnServer.plugins;

  for (let plugin of plugins) {
    // Plugins must specify their version, and by default that version should match
    // the version of kibana down to the patch level. If these two versions need
    // to diverge, they can specify a kibana.version to indicate the version of
    // kibana the plugin is intended to work with.
    const version = get(plugin, 'pkg.kibana.version', get(plugin, 'pkg.version'));
    const name = get(plugin, 'pkg.name');

    if (!compatibleWithKibana(kbnServer, version)) {
      const message = `Plugin "${name}" was disabled because it expected Kibana version "${version}", and found "${kbnServer.version}".`;
      warningMessages.add(message);
      plugins.delete(plugin);
    }
  }

  for (let message of warningMessages) {
    server.log(['warning'], message);
  }

  return;
};
