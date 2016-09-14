import pluginInit from './plugin_init';
import { cleanVersion, versionSatisfies } from '../../utils/version';
import _ from 'lodash';

module.exports = async function (kbnServer, server, config) {
  const warningMessages = new Set();
  const plugins = kbnServer.plugins;

  for (let plugin of plugins) {
    // Plugins must specify their version, and by default that version should match
    // the version of kibana down to the patch level. If these two versions need
    // to diverge, they can specify a kibana.version to indicate the version of
    // kibana the plugin is intended to work with.
    const version = _.get(plugin, 'pkg.kibana.version', _.get(plugin, 'pkg.version'));
    const name = _.get(plugin, 'pkg.name');

    if (version === 'kibana') continue;

    if (!versionSatisfies(
      cleanVersion(version),
      cleanVersion(kbnServer.version))) {
      warningMessages.add(`Plugin "${name}" expected Kibana version "${version}" and was disabled.`);
      plugins.delete(plugin);
    }
  }

  //because a plugin pack can contain more than one actual plugin, (for example x-pack)
  //we make sure that the warning messages are unique
  for (let message of warningMessages) {
    server.log(['warning'], message);
  }

  return;
};
