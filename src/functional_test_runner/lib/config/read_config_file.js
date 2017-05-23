import { defaultsDeep } from 'lodash';

import { Config } from './config';
import { transformDeprecations } from './transform_deprecations';

async function getSettingsFromFile(log, path, settingOverrides) {
  log.debug('Loading config file from %j', path);

  const configModule = require(path);
  const configProvider = configModule.__esModule
    ? configModule.default
    : configModule;

  const settingsWithDefaults = defaultsDeep(
    {},
    settingOverrides,
    await configProvider({
      log,
      async readConfigFile(...args) {
        return new Config({
          settings: await getSettingsFromFile(log, ...args),
          primary: false,
          path,
        });
      }
    })
  );

  const logDeprecation = (...args) => log.error(...args);
  return transformDeprecations(settingsWithDefaults, logDeprecation);
}

export async function readConfigFile(log, path, settingOverrides) {
  return new Config({
    settings: await getSettingsFromFile(log, path, settingOverrides),
    primary: true,
    path,
  });
}
