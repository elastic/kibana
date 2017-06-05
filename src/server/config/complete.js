import { difference, keys } from 'lodash';
import { transformDeprecations } from './transform_deprecations';

const getUnusedSettings = (settings, configValues) => {
  return difference(keys(transformDeprecations(settings)), keys(configValues));
};

export default function (kbnServer, server, config) {

  server.decorate('server', 'config', function () {
    return kbnServer.config;
  });

  for (const key of getUnusedSettings(kbnServer.settings, config.get())) {
    server.log(['warning', 'config'], `Settings for "${key}" were not applied, check for spelling errors and ensure the plugin is loaded.`);
  }
}
