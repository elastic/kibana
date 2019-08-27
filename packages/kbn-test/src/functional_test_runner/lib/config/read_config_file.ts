/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ToolingLog } from '@kbn/dev-utils';
import { defaultsDeep } from 'lodash';

import { Config } from './config';
import { transformDeprecations } from './transform_deprecations';

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

  const logDeprecation = (error: string | Error) => log.error(error);
  return transformDeprecations(settingsWithDefaults, logDeprecation);
}

export async function readConfigFile(log: ToolingLog, path: string, settingOverrides: any) {
  return new Config({
    settings: await getSettingsFromFile(log, path, settingOverrides),
    primary: true,
    path,
  });
}
