/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';
import { defaultsDeep } from 'lodash';

import { Config } from './config';

const cache = new WeakMap();

async function getSettingsFromFile(log: ToolingLog, path: string, settingOverrides: any) {
  const configModule = require(path); // eslint-disable-line @typescript-eslint/no-var-requires
  const configProvider = configModule.__esModule ? configModule.default : configModule;

  if (!cache.has(configProvider)) {
    log.debug('Loading config file from %j', path);
    cache.set(
      configProvider,
      configProvider({
        log,
        async readConfigFile(p: string, o: any) {
          return new Config({
            settings: await getSettingsFromFile(log, p, o),
            primary: false,
            path: p,
          });
        },
      })
    );
  }

  const settingsWithDefaults: any = defaultsDeep(
    {},
    settingOverrides,
    await cache.get(configProvider)!
  );

  return settingsWithDefaults;
}

export async function readConfigFile(log: ToolingLog, path: string, settingOverrides: any = {}) {
  return new Config({
    settings: await getSettingsFromFile(log, path, settingOverrides),
    primary: true,
    path,
  });
}
