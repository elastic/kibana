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

import { mockPackage, mockDiscover } from './plugins_service.test.mocks';

import { join } from 'path';

import { PluginsService } from '../plugins_service';
import { ConfigPath, ConfigService, Env } from '../../config';
import { getEnvOptions } from '../../config/__mocks__/env';
import { BehaviorSubject, from } from 'rxjs';
import { rawConfigServiceMock } from '../../config/raw_config_service.mock';
import { config } from '../plugins_config';
import { loggingSystemMock } from '../../logging/logging_system.mock';
import { environmentServiceMock } from '../../environment/environment_service.mock';
import { coreMock } from '../../mocks';
import { Plugin } from '../types';
import { PluginWrapper } from '../plugin';

describe('PluginsService', () => {
  const logger = loggingSystemMock.create();
  const environmentSetup = environmentServiceMock.createSetupContract();
  let pluginsService: PluginsService;

  const createPlugin = (
    id: string,
    {
      path = id,
      disabled = false,
      version = 'some-version',
      requiredPlugins = [],
      requiredBundles = [],
      optionalPlugins = [],
      kibanaVersion = '7.0.0',
      configPath = [path],
      server = true,
      ui = true,
    }: {
      path?: string;
      disabled?: boolean;
      version?: string;
      requiredPlugins?: string[];
      requiredBundles?: string[];
      optionalPlugins?: string[];
      kibanaVersion?: string;
      configPath?: ConfigPath;
      server?: boolean;
      ui?: boolean;
    }
  ): PluginWrapper => {
    return new PluginWrapper({
      path,
      manifest: {
        id,
        version,
        configPath: `${configPath}${disabled ? '-disabled' : ''}`,
        kibanaVersion,
        requiredPlugins,
        requiredBundles,
        optionalPlugins,
        server,
        ui,
      },
      opaqueId: Symbol(id),
      initializerContext: { logger } as any,
    });
  };

  beforeEach(async () => {
    mockPackage.raw = {
      branch: 'feature-v1',
      version: 'v1',
      build: {
        distributable: true,
        number: 100,
        sha: 'feature-v1-build-sha',
      },
    };

    const env = Env.createDefault(getEnvOptions());
    const config$ = new BehaviorSubject<Record<string, any>>({
      plugins: {
        initialize: true,
      },
    });
    const rawConfigService = rawConfigServiceMock.create({ rawConfig$: config$ });
    const configService = new ConfigService(rawConfigService, env, logger);
    await configService.setSchema(config.path, config.schema);

    pluginsService = new PluginsService({
      coreId: Symbol('core'),
      env,
      logger,
      configService,
    });
  });

  it("properly resolves `getStartServices` in plugin's lifecycle", async () => {
    expect.assertions(6);

    const pluginPath = 'plugin-path';

    mockDiscover.mockReturnValue({
      error$: from([]),
      plugin$: from([
        createPlugin('plugin-id', {
          path: pluginPath,
          configPath: 'path',
        }),
      ]),
    });

    let startDependenciesResolved = false;
    let contextFromStart: any = null;
    let contextFromStartService: any = null;

    const pluginStartContract = {
      someApi: () => 'foo',
    };

    const pluginInitializer = () =>
      ({
        setup: async (coreSetup, deps) => {
          coreSetup.getStartServices().then(([core, plugins, pluginStart]) => {
            startDependenciesResolved = true;
            contextFromStartService = { core, plugins, pluginStart };
          });
        },
        start: async (core, plugins) => {
          contextFromStart = { core, plugins };
          await new Promise((resolve) => setTimeout(resolve, 10));
          expect(startDependenciesResolved).toBe(false);
          return pluginStartContract;
        },
      } as Plugin<void, typeof pluginStartContract, {}, {}>);

    jest.doMock(
      join(pluginPath, 'server'),
      () => ({
        plugin: pluginInitializer,
      }),
      {
        virtual: true,
      }
    );

    await pluginsService.discover({ environment: environmentSetup });

    const setupDeps = coreMock.createInternalSetup();
    await pluginsService.setup(setupDeps);

    expect(startDependenciesResolved).toBe(false);

    const startDeps = coreMock.createInternalStart();
    await pluginsService.start(startDeps);

    expect(startDependenciesResolved).toBe(true);
    expect(contextFromStart!.core).toEqual(contextFromStartService!.core);
    expect(contextFromStart!.plugins).toEqual(contextFromStartService!.plugins);
    expect(contextFromStartService!.pluginStart).toEqual(pluginStartContract);
  });
});
