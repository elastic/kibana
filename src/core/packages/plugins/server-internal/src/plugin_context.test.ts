/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { duration } from 'moment';
import { first } from 'rxjs';
import { REPO_ROOT, fromRoot } from '@kbn/repo-info';
import { rawConfigServiceMock, getEnvOptions, configServiceMock } from '@kbn/config-mocks';
import type { CoreContext } from '@kbn/core-base-server-internal';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { NodeInfo } from '@kbn/core-node-server';
import { nodeServiceMock } from '@kbn/core-node-server-mocks';
import {
  createPluginInitializerContext,
  createPluginPrebootSetupContext,
  InstanceInfo,
} from './plugin_context';

import { PluginType } from '@kbn/core-base-common';
import { PluginManifest } from '@kbn/core-plugins-server';
import { schema, ByteSizeValue } from '@kbn/config-schema';
import { ConfigService, Env } from '@kbn/config';
import { PluginWrapper } from './plugin';

import { coreInternalLifecycleMock } from '@kbn/core-lifecycle-server-mocks';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { createCoreContextConfigServiceMock } from './test_helpers';

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
    runtimePluginDependencies: [],
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
  let instanceInfo: InstanceInfo;
  let nodeInfo: NodeInfo;

  beforeEach(async () => {
    logger = loggingSystemMock.create();
    coreId = Symbol('core');
    opaqueId = Symbol();
    instanceInfo = {
      uuid: 'instance-uuid',
    };
    nodeInfo = nodeServiceMock.createInternalPrebootContract();
    env = Env.createDefault(REPO_ROOT, getEnvOptions());
    coreContext = mockCoreContext.create({
      env,
      logger,
      configService: configServiceMock.create(),
    });
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

      const pluginInitializerContext = createPluginInitializerContext({
        coreContext,
        opaqueId,
        manifest,
        instanceInfo,
        nodeInfo,
      });

      expect(pluginInitializerContext.config.get()).toEqual({
        foo: 'bar',
        answer: 42,
      });
    });

    it('config.globalConfig$ should be an observable for the global config', async () => {
      const configService = createCoreContextConfigServiceMock();

      coreContext = { coreId, env, logger, configService };

      const manifest = createPluginManifest();

      const pluginInitializerContext = createPluginInitializerContext({
        coreContext,
        opaqueId,
        manifest,
        instanceInfo,
        nodeInfo,
      });

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
      const pluginInitializerContext = createPluginInitializerContext({
        coreContext,
        opaqueId,
        manifest,
        instanceInfo,
        nodeInfo,
      });
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
      const pluginInitializerContext = createPluginInitializerContext({
        coreContext,
        opaqueId,
        manifest: createPluginManifest(),
        instanceInfo,
        nodeInfo,
      });
      expect(pluginInitializerContext.env.configs).toEqual([
        '/home/kibana/config/kibana.yml',
        '/home/kibana/config/kibana.dev.yml',
      ]);
    });
  });

  describe('context.node', () => {
    it('should expose the correct node roles', () => {
      const pluginInitializerContext = createPluginInitializerContext({
        coreContext,
        opaqueId,
        manifest: createPluginManifest(),
        instanceInfo,
        nodeInfo: { roles: { backgroundTasks: false, ui: true, migrator: false } },
      });
      expect(pluginInitializerContext.node.roles.backgroundTasks).toBe(false);
      expect(pluginInitializerContext.node.roles.ui).toBe(true);
    });
  });
});

describe('createPluginPrebootSetupContext', () => {
  let coreContext: CoreContext;
  let opaqueId: symbol;
  let nodeInfo: NodeInfo;

  beforeEach(async () => {
    opaqueId = Symbol();
    coreContext = {
      coreId: Symbol('core'),
      env: Env.createDefault(REPO_ROOT, getEnvOptions()),
      logger: loggingSystemMock.create(),
      configService: configServiceMock.create(),
    };
    nodeInfo = nodeServiceMock.createInternalPrebootContract();
  });

  it('`holdSetupUntilResolved` captures plugin.name', () => {
    const manifest = createPluginManifest();
    const plugin = new PluginWrapper({
      path: 'some-path',
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext({
        coreContext,
        opaqueId,
        manifest,
        instanceInfo: {
          uuid: 'instance-uuid',
        },
        nodeInfo,
      }),
    });

    const corePreboot = coreInternalLifecycleMock.createInternalPreboot();
    const prebootSetupContext = createPluginPrebootSetupContext({ deps: corePreboot, plugin });

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
