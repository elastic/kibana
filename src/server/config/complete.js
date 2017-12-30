import { difference } from 'lodash';
import { transformDeprecations } from './transform_deprecations';
import { formatListAsProse, getFlattenedObject } from '../../utils';

const getFlattenedKeys = object => (
  Object.keys(getFlattenedObject(object))
);

const getUnusedConfigKeys = (settings, configValues) => {
  const inputKeys = getFlattenedKeys(transformDeprecations(settings));
  const appliedKeys = getFlattenedKeys(configValues);

  if (inputKeys.includes('env')) {
    // env is a special case key, see https://github.com/elastic/kibana/blob/848bf17b/src/server/config/config.js#L74
    // where it is deleted from the settings before being injected into the schema via context and
    // then renamed to `env.name` https://github.com/elastic/kibana/blob/848bf17/src/server/config/schema.js#L17
    inputKeys[inputKeys.indexOf('env')] = 'env.name';
  }

  return difference(inputKeys, appliedKeys);
};

export default function (kbnServer, server, config) {

  server.decorate('server', 'config', function () {
    return kbnServer.config;
  });

  const origConfigGet = kbnServer.config.get;
  kbnServer.config.get = (key, ...rest) => {
    if (key === 'server.basePath') {
      server.log(['warning', 'deprecation'], {
        tmpl: 'Accessing server.basePath directly via config is deprecated. Use request.getBasePath() instead. <%= location %>',
        location: (new Error()).stack.split('\n')[2].trim()
      });
    }

    return origConfigGet.call(kbnServer.config, key, ...rest);
  };

  server.decorate('server', 'getRootBasePath', () => (
    origConfigGet.call(kbnServer.config, 'server.basePath')
  ));

  const reqAltBasePaths = new WeakMap();
  server.decorate('request', 'extendBasePath', function (extension) {
    reqAltBasePaths.set(this, `${server.getRootBasePath()}${extension}`);
  });

  server.decorate('request', 'getBasePath', function () {
    return (
      reqAltBasePaths.get(this) ||
      origConfigGet.call(kbnServer.config, 'server.basePath')
    );
  });

  const unusedKeys = getUnusedConfigKeys(kbnServer.settings, config.get())
    .map(key => `"${key}"`);

  if (!unusedKeys.length) {
    return;
  }

  const desc = unusedKeys.length === 1
    ? 'setting was'
    : 'settings were';

  const error = new Error(
    `${formatListAsProse(unusedKeys)} ${desc} not applied. ` +
    'Check for spelling errors and ensure that expected ' +
    'plugins are installed and enabled.'
  );

  error.code = 'InvalidConfig';
  error.processExitCode = 64;
  throw error;
}
