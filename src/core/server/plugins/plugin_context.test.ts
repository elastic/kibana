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

import { createPluginInitializerContext } from './plugin_context';
import { CoreContext } from '../core_context';
import { Env, ObjectToConfigAdapter } from '../config';
import { configServiceMock } from '../config/config_service.mock';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { getEnvOptions } from '../config/__mocks__/env';
import { PluginManifest } from './types';
import { first } from 'rxjs/operators';

const logger = loggingServiceMock.create();
const configService = configServiceMock.create({ getConfig$: { globalConfig: { subpath: 1 } } });

let coreId: symbol;
let env: Env;
let coreContext: CoreContext;

function createPluginManifest(manifestProps: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'some-plugin-id',
    version: 'some-version',
    configPath: 'path',
    kibanaVersion: '7.0.0',
    requiredPlugins: ['some-required-dep'],
    optionalPlugins: ['some-optional-dep'],
    server: true,
    ui: true,
    ...manifestProps,
  };
}

beforeEach(() => {
  coreId = Symbol('core');
  env = Env.createDefault(getEnvOptions());
  coreContext = { coreId, env, logger, configService };
});

test('should return a globalConfig handler in the context (to be deprecated)', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const pluginInitializerContext = createPluginInitializerContext(coreContext, opaqueId, manifest);

  expect(pluginInitializerContext.config.globalConfig__deprecated$).toBeDefined();

  const configObject = await pluginInitializerContext.config.globalConfig__deprecated$
    .pipe(first())
    .toPromise();
  expect(configObject).toBeInstanceOf(ObjectToConfigAdapter);

  const configPaths = configObject.getFlattenedPaths();
  expect(configPaths).toHaveLength(1);
  expect(configPaths).toStrictEqual(['globalConfig.subpath']);
  expect(configObject.has('globalConfig.subpath')).toBe(true);
  expect(configObject.get('globalConfig.subpath')).toBe(1);
});
