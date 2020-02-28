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

import { duration } from 'moment';
import { first } from 'rxjs/operators';
import { createPluginInitializerContext } from './plugin_context';
import { CoreContext } from '../core_context';
import { Env } from '../config';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { rawConfigServiceMock } from '../config/raw_config_service.mock';
import { getEnvOptions } from '../config/__mocks__/env';
import { PluginManifest } from './types';
import { Server } from '../server';
import { fromRoot } from '../utils';

const logger = loggingServiceMock.create();

let coreId: symbol;
let env: Env;
let coreContext: CoreContext;
let server: Server;

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

describe('Plugin Context', () => {
  beforeEach(async () => {
    coreId = Symbol('core');
    env = Env.createDefault(getEnvOptions());
    const config$ = rawConfigServiceMock.create({ rawConfig: {} });
    server = new Server(config$, env, logger);
    await server.setupCoreConfig();
    coreContext = { coreId, env, logger, configService: server.configService };
  });

  it('should return a globalConfig handler in the context', async () => {
    const manifest = createPluginManifest();
    const opaqueId = Symbol();
    const pluginInitializerContext = createPluginInitializerContext(
      coreContext,
      opaqueId,
      manifest
    );

    expect(pluginInitializerContext.config.legacy.globalConfig$).toBeDefined();

    const configObject = await pluginInitializerContext.config.legacy.globalConfig$
      .pipe(first())
      .toPromise();
    expect(configObject).toStrictEqual({
      kibana: {
        defaultAppId: 'home',
        index: '.kibana',
        autocompleteTerminateAfter: duration(100000),
        autocompleteTimeout: duration(1000),
      },
      elasticsearch: {
        shardTimeout: duration(30, 's'),
        requestTimeout: duration(30, 's'),
        pingTimeout: duration(30, 's'),
        startupTimeout: duration(5, 's'),
      },
      path: { data: fromRoot('data') },
    });
  });
});
