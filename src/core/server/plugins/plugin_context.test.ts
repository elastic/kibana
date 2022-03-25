/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { duration } from 'moment';
import { first } from 'rxjs/operators';
import { REPO_ROOT } from '@kbn/utils';
import { fromRoot } from '@kbn/utils';
import {
  createPluginInitializerContext,
  createPluginPrebootSetupContext,
  InstanceInfo,
} from './plugin_context';
import { CoreContext } from '../core_context';
import { Env } from '../config';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { rawConfigServiceMock, getEnvOptions, configServiceMock } from '../config/mocks';
import { PluginManifest, PluginType } from './types';
import { Server } from '../server';
import { schema, ByteSizeValue } from '@kbn/config-schema';
import { ConfigService } from '@kbn/config';
import { PluginWrapper } from './plugin';
import { coreMock } from '../mocks';

function createPluginManifest(manifestProps: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'some-plugin-id',
    version: 'some-version',
    configPath: 'path',
    kibanaVersion: '7.0.0',
    type: PluginType.standard,
    requiredPlugins: ['some-required-dep'],
    requiredBundles: [],
    optionalPlugins: ['some-optional-dep'],
    server: true,
    ui: true,
    owner: {
      name: 'Core',
      githubTeam: 'kibana-core',
    },
    ...manifestProps,
  };
}

describe('createPluginInitializerContext', () => {
  let logger: ReturnType<typeof loggingSystemMock.create>;
  let coreId: symbol;
  let opaqueId: symbol;
  let env: Env;
  let coreContext: CoreContext;
  let server: Server;
  let instanceInfo: InstanceInfo;

  beforeEach(async () => {
    logger = loggingSystemMock.create();
    coreId = Symbol('core');
    opaqueId = Symbol();
    instanceInfo = {
      uuid: 'instance-uuid',
    };
    env = Env.createDefault(REPO_ROOT, getEnvOptions());
    const config$ = rawConfigServiceMock.create({ rawConfig: {} });
    server = new Server(config$, env, logger);
    server.setupCoreConfig();
    coreContext = { coreId, env, logger, configService: server.configService };
  });

  describe('context.config', () => {
    it('config.get() should return the plugin config synchronously', async () => {
      const config$ = rawConfigServiceMock.create({
        rawConfig: {
          plugin: {
            foo: 'bar',
            answer: 42,
          },
        },
      });

      const configService = new ConfigService(config$, env, logger);
      configService.setSchema(
        'plugin',
        schema.object({
          foo: schema.string(),
          answer: schema.number(),
        })
      );
      await configService.validate();

      coreContext = { coreId, env, logger, configService };

      const manifest = createPluginManifest({
        configPath: 'plugin',
      });

      const pluginInitializerContext = createPluginInitializerContext(
        coreContext,
        opaqueId,
        manifest,
        instanceInfo
      );

      expect(pluginInitializerContext.config.get()).toEqual({
        foo: 'bar',
        answer: 42,
      });
    });

    it('config.globalConfig$ should be an observable for the global config', async () => {
      const manifest = createPluginManifest();
      const pluginInitializerContext = createPluginInitializerContext(
        coreContext,
        opaqueId,
        manifest,
        instanceInfo
      );

      expect(pluginInitializerContext.config.legacy.globalConfig$).toBeDefined();

      const configObject = await pluginInitializerContext.config.legacy.globalConfig$
        .pipe(first())
        .toPromise();
      expect(configObject).toStrictEqual({
        elasticsearch: {
          shardTimeout: duration(30, 's'),
          requestTimeout: duration(30, 's'),
          pingTimeout: duration(30, 's'),
        },
        path: { data: fromRoot('data') },
        savedObjects: { maxImportPayloadBytes: new ByteSizeValue(26214400) },
      });
    });
  });

  describe('context.env', () => {
    it('should expose the correct instance uuid', () => {
      const manifest = createPluginManifest();
      instanceInfo = {
        uuid: 'kibana-uuid',
      };
      const pluginInitializerContext = createPluginInitializerContext(
        coreContext,
        opaqueId,
        manifest,
        instanceInfo
      );
      expect(pluginInitializerContext.env.instanceUuid).toBe('kibana-uuid');
    });

    it('should expose paths to the config files', () => {
      coreContext = {
        ...coreContext,
        env: Env.createDefault(
          REPO_ROOT,
          getEnvOptions({
            configs: ['/home/kibana/config/kibana.yml', '/home/kibana/config/kibana.dev.yml'],
          })
        ),
      };
      const pluginInitializerContext = createPluginInitializerContext(
        coreContext,
        opaqueId,
        createPluginManifest(),
        instanceInfo
      );
      expect(pluginInitializerContext.env.configs).toEqual([
        '/home/kibana/config/kibana.yml',
        '/home/kibana/config/kibana.dev.yml',
      ]);
    });
  });
});

describe('createPluginPrebootSetupContext', () => {
  let coreContext: CoreContext;
  let opaqueId: symbol;

  beforeEach(async () => {
    opaqueId = Symbol();
    coreContext = {
      coreId: Symbol('core'),
      env: Env.createDefault(REPO_ROOT, getEnvOptions()),
      logger: loggingSystemMock.create(),
      configService: configServiceMock.create(),
    };
  });

  it('`holdSetupUntilResolved` captures plugin.name', () => {
    const manifest = createPluginManifest();
    const plugin = new PluginWrapper({
      path: 'some-path',
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest, {
        uuid: 'instance-uuid',
      }),
    });

    const corePreboot = coreMock.createInternalPreboot();
    const prebootSetupContext = createPluginPrebootSetupContext(coreContext, corePreboot, plugin);

    const holdSetupPromise = Promise.resolve(undefined);
    prebootSetupContext.preboot.holdSetupUntilResolved('some-reason', holdSetupPromise);

    expect(corePreboot.preboot.holdSetupUntilResolved).toHaveBeenCalledTimes(1);
    expect(corePreboot.preboot.holdSetupUntilResolved).toHaveBeenCalledWith(
      'some-plugin-id',
      'some-reason',
      holdSetupPromise
    );
  });
});
