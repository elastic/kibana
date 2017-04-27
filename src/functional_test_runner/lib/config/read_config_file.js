import { defaultsDeep } from 'lodash';

import { Config } from './config';

export async function readConfigFile(log, configFile, settingOverrides = {}) {
  log.debug('Loading config file from %j', configFile);

  const configModule = require(configFile);
  const configProvider = configModule.__esModule
    ? configModule.default
    : configModule;

  const settings = defaultsDeep(
    {},
    settingOverrides,
    await configProvider({
      log,

      // give a version of the readConfigFile function to
      // the config file that already has has the logger bound
      readConfigFile: async (...args) => (
        await readConfigFile(log, ...args)
      )
    })
  );

  return new Config(settings);
}
