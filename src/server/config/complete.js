import { difference, keys } from 'lodash';
import { transformDeprecations } from './transform_deprecations';
import flattenWith from './flatten_with';
import { formatListAsProse } from '../../utils';

const getUnusedConfigKeys = (settings, configValues) => {
  const inputKeys = keys(flattenWith('.', transformDeprecations(settings)));
  if (inputKeys.includes('env')) {
    // env is a special case key, see https://github.com/elastic/kibana/blob/848bf17b/src/server/config/config.js#L74
    // where it is deleted from the settings before being injected into the schema via context and
    // then renamed to `env.name` https://github.com/elastic/kibana/blob/848bf17/src/server/config/schema.js#L17
    inputKeys[inputKeys.indexOf('env')] = 'env.name';
  }
  const appliedKeys = keys(flattenWith('.', configValues));
  return difference(inputKeys, appliedKeys);
};

export default function (kbnServer, server, config) {

  server.decorate('server', 'config', function () {
    return kbnServer.config;
  });

  const unusedKeys = getUnusedConfigKeys(kbnServer.settings, config.get())
    .map(key => `"${key}"`);

  if (!unusedKeys.length) {
    return;
  }

  const noun = unusedKeys.length === 1 ? 'setting' : 'settings';
  const verb = unusedKeys.length === 1 ? 'was' : 'were';
  const error = new Error(
    `${formatListAsProse(unusedKeys)} ${noun} ${verb} not applied. ` +
    'Check for spelling errors and ensure that expected ' +
    'plugins are installed and enabled.'
  );

  error.code = 'InvalidConfig';
  error.processExitCode = 64;
  throw error;
}
