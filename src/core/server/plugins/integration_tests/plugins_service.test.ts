/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// must be before mocks imports to avoid conflicting with `REPO_ROOT` accessor.
import { REPO_ROOT } from '@kbn/utils';
import { mockPackage, mockDiscover } from './plugins_service.test.mocks';

import { join } from 'path';

import { PluginsService } from '../plugins_service';
import { ConfigPath, ConfigService, Env } from '../../config';
import { getEnvOptions, rawConfigServiceMock } from '../../config/mocks';
import { BehaviorSubject, from } from 'rxjs';
import { config } from '../plugins_config';
import { loggingSystemMock } from '../../logging/logging_system.mock';
import { environmentServiceMock } from '../../environment/environment_service.mock';
import { coreMock } from '../../mocks';
import { AsyncPlugin, PluginType } from '../types';
import { PluginWrapper } from '../plugin';

describe('PluginsService', () => {
  const logger = loggingSystemMock.create();
  const environmentPreboot = environmentServiceMock.createPrebootContract();
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
      type = PluginType.standard,
      configPath = [path],
      server = true,
      ui = true,
      owner = { name: 'foo' },
    }: {
      path?: string;
      disabled?: boolean;
      version?: string;
      requiredPlugins?: string[];
      requiredBundles?: string[];
      optionalPlugins?: string[];
      kibanaVersion?: string;
      type?: PluginType;
      configPath?: ConfigPath;
      server?: boolean;
      ui?: boolean;
      owner?: { name: string };
    }
  ): PluginWrapper => {
    return new PluginWrapper({
      path,
      manifest: {
        id,
        version,
        configPath: `${configPath}${disabled ? '-disabled' : ''}`,
        kibanaVersion,
        type,
        requiredPlugins,
        requiredBundles,
        optionalPlugins,
        server,
        ui,
        owner,
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

    const env = Env.createDefault(REPO_ROOT, getEnvOptions());
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
      } as AsyncPlugin<void, typeof pluginStartContract, {}, {}>);

    jest.doMock(
      join(pluginPath, 'server'),
      () => ({
        plugin: pluginInitializer,
      }),
      {
        virtual: true,
      }
    );

    await pluginsService.discover({ environment: environmentPreboot });

    const prebootDeps = coreMock.createInternalPreboot();
    await pluginsService.preboot(prebootDeps);

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
