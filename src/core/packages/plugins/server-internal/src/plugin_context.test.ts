/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { duration } from 'moment';
import { first, of } from 'rxjs';
import { REPO_ROOT, fromRoot } from '@kbn/repo-info';
import { rawConfigServiceMock, getEnvOptions, configServiceMock } from '@kbn/config-mocks';
import type { CoreContext } from '@kbn/core-base-server-internal';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { NodeInfo } from '@kbn/core-node-server';
import { nodeServiceMock } from '@kbn/core-node-server-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
import type { RequestHandler } from '@kbn/core-http-server';
import type { InstanceInfo } from './plugin_context';
import {
  createPluginInitializerContext,
  createPluginPrebootSetupContext,
  createPluginSetupContext,
  createPluginStartContext,
} from './plugin_context';
import { createRuntimePluginContractResolverMock } from './test_helpers';
import { DeferredInitEngine } from './deferred_init';

import { PluginType } from '@kbn/core-base-common';
import type { PluginInitStatus, PluginManifest } from '@kbn/core-plugins-server';
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
  let engineLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let deferredInitEngine: DeferredInitEngine;

  beforeEach(async () => {
    logger = loggingSystemMock.create();
    engineLogger = loggingSystemMock.createLogger();
    deferredInitEngine = new DeferredInitEngine(engineLogger);
    coreId = Symbol('core');
    opaqueId = Symbol();
    instanceInfo = {
      uuid: 'instance-uuid',
      airgapped: false,
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
        deferredInitEngine,
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
        deferredInitEngine,
      });

      expect(pluginInitializerContext.config.legacy.globalConfig$).toBeDefined();

      const configObject = await pluginInitializerContext.config.legacy.globalConfig$
        .pipe(first())
        .toPromise();
      expect(configObject).toStrictEqual({
        elasticsearch: {
          shardTimeout: duration(30, 's'),
          requestTimeout: duration(30, 's'),
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
        airgapped: false,
      };
      const pluginInitializerContext = createPluginInitializerContext({
        coreContext,
        opaqueId,
        manifest,
        instanceInfo,
        nodeInfo,
        deferredInitEngine,
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
        deferredInitEngine,
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
        deferredInitEngine,
      });
      expect(pluginInitializerContext.node.roles.backgroundTasks).toBe(false);
      expect(pluginInitializerContext.node.roles.ui).toBe(true);
    });
  });

  describe('context.initialization', () => {
    const manifest = createPluginManifest();

    const createContext = () =>
      createPluginInitializerContext({
        coreContext,
        opaqueId,
        manifest,
        instanceInfo,
        nodeInfo,
        deferredInitEngine,
      });

    it('reports idle for a plugin the engine does not know, and registers nothing with the engine', () => {
      const { initialization } = createContext();

      expect(initialization.getStatus()).toEqual({ state: 'idle', attempts: 0 });
      // With no record to kick, the engine has nothing to warn about either.
      expect(deferredInitEngine.ensureInitialized(manifest.id)).toBe('idle');
      expect(engineLogger.warn).not.toHaveBeenCalled();
    });

    it('initialize() runs the attempt the engine holds for the plugin and resolves once it succeeds', async () => {
      const runner = jest.fn().mockResolvedValue(undefined);
      deferredInitEngine.register(manifest.id);
      deferredInitEngine.setRunner(manifest.id, runner);
      const { initialization } = createContext();

      await expect(initialization.initialize()).resolves.toBeUndefined();

      expect(runner).toHaveBeenCalledTimes(1);
      expect(initialization.getStatus()).toEqual({ state: 'available', attempts: 0 });
    });

    it('initialize() rejects for a plugin the engine never registered', async () => {
      const { initialization } = createContext();

      await expect(initialization.initialize()).rejects.toThrow(
        `Plugin "${manifest.id}" cannot be initialized`
      );
    });

    it('status$ replays the current status and never runs initialize()', async () => {
      const runner = jest.fn().mockResolvedValue(undefined);
      deferredInitEngine.register(manifest.id);
      deferredInitEngine.setRunner(manifest.id, runner);
      const { initialization } = createContext();

      const seen: PluginInitStatus[] = [];
      initialization.status$.subscribe((status) => seen.push(status));

      expect(seen).toEqual([{ state: 'idle', attempts: 0 }]);
      expect(runner).not.toHaveBeenCalled();

      await initialization.initialize();

      expect(seen.map(({ state }) => state)).toEqual(['idle', 'initializing', 'available']);
    });
  });
});

describe('createPluginPrebootSetupContext', () => {
  let coreContext: CoreContext;
  let opaqueId: symbol;
  let nodeInfo: NodeInfo;
  let deferredInitEngine: DeferredInitEngine;

  beforeEach(async () => {
    opaqueId = Symbol();
    coreContext = {
      coreId: Symbol('core'),
      env: Env.createDefault(REPO_ROOT, getEnvOptions()),
      logger: loggingSystemMock.create(),
      configService: configServiceMock.create(),
    };
    nodeInfo = nodeServiceMock.createInternalPrebootContract();
    deferredInitEngine = new DeferredInitEngine(loggingSystemMock.createLogger());
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
          airgapped: false,
        },
        nodeInfo,
        deferredInitEngine,
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

describe('createPluginSetupContext', () => {
  let coreContext: CoreContext;
  let opaqueId: symbol;
  let nodeInfo: NodeInfo;
  let deferredInitEngine: DeferredInitEngine;

  beforeEach(async () => {
    opaqueId = Symbol();
    coreContext = {
      coreId: Symbol('core'),
      env: Env.createDefault(REPO_ROOT, getEnvOptions()),
      logger: loggingSystemMock.create(),
      configService: configServiceMock.create(),
    };
    nodeInfo = nodeServiceMock.createInternalPrebootContract();
    deferredInitEngine = new DeferredInitEngine(loggingSystemMock.createLogger());
  });

  const createPlugin = (manifest: PluginManifest) =>
    new PluginWrapper({
      path: 'some-path',
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext({
        coreContext,
        opaqueId,
        manifest,
        instanceInfo: { uuid: 'instance-uuid', airgapped: false },
        nodeInfo,
        deferredInitEngine,
      }),
    });

  const createRuntimeResolver = () => createRuntimePluginContractResolverMock();

  describe('plugins', () => {
    const status: PluginInitStatus = { state: 'available', attempts: 0 };

    it('exposes onSetup, onStart and the dependency initialization APIs, and nothing else', () => {
      const ctx = createPluginSetupContext({
        deps: coreInternalLifecycleMock.createInternalSetup(),
        plugin: createPlugin(createPluginManifest()),
        runtimeResolver: createRuntimeResolver(),
      });

      expect(Object.keys(ctx.plugins).sort()).toEqual([
        'getPluginInitStatus',
        'initializePlugin',
        'onSetup',
        'onStart',
        'pluginInitStatus$',
      ]);
    });

    it('scopes the dependency initialization APIs to the calling plugin and delegates to the resolver', async () => {
      const runtimeResolver = createRuntimeResolver();
      runtimeResolver.initializePlugin.mockResolvedValue(undefined);
      runtimeResolver.getPluginInitStatus.mockReturnValue(status);
      const status$ = of(status);
      runtimeResolver.pluginInitStatus$.mockReturnValue(status$);

      const ctx = createPluginSetupContext({
        deps: coreInternalLifecycleMock.createInternalSetup(),
        plugin: createPlugin(createPluginManifest()),
        runtimeResolver,
      });

      await expect(ctx.plugins.initializePlugin('some-required-dep')).resolves.toBeUndefined();
      expect(runtimeResolver.initializePlugin).toHaveBeenCalledWith(
        'some-plugin-id',
        'some-required-dep'
      );

      expect(ctx.plugins.getPluginInitStatus('some-required-dep')).toBe(status);
      expect(runtimeResolver.getPluginInitStatus).toHaveBeenCalledWith(
        'some-plugin-id',
        'some-required-dep'
      );

      expect(ctx.plugins.pluginInitStatus$('some-required-dep')).toBe(status$);
      expect(runtimeResolver.pluginInitStatus$).toHaveBeenCalledWith(
        'some-plugin-id',
        'some-required-dep'
      );
    });

    it('initializePlugin rejects when the resolver rejects', async () => {
      const runtimeResolver = createRuntimeResolver();
      runtimeResolver.initializePlugin.mockRejectedValue(new Error('init failed'));

      const ctx = createPluginSetupContext({
        deps: coreInternalLifecycleMock.createInternalSetup(),
        plugin: createPlugin(createPluginManifest()),
        runtimeResolver,
      });

      await expect(ctx.plugins.initializePlugin('some-required-dep')).rejects.toThrow(
        'init failed'
      );
    });

    it('exposes the same members, minus onSetup, on the start context', async () => {
      const runtimeResolver = createRuntimeResolver();
      runtimeResolver.initializePlugin.mockResolvedValue(undefined);
      runtimeResolver.getPluginInitStatus.mockReturnValue(status);
      const status$ = of(status);
      runtimeResolver.pluginInitStatus$.mockReturnValue(status$);

      const ctx = createPluginStartContext({
        deps: coreInternalLifecycleMock.createInternalStart(),
        plugin: createPlugin(createPluginManifest()),
        runtimeResolver,
      });

      expect(Object.keys(ctx.plugins).sort()).toEqual([
        'getPluginInitStatus',
        'initializePlugin',
        'onStart',
        'pluginInitStatus$',
      ]);

      await expect(ctx.plugins.initializePlugin('some-optional-dep')).resolves.toBeUndefined();
      expect(runtimeResolver.initializePlugin).toHaveBeenCalledWith(
        'some-plugin-id',
        'some-optional-dep'
      );
      expect(ctx.plugins.getPluginInitStatus('some-optional-dep')).toBe(status);
      expect(runtimeResolver.getPluginInitStatus).toHaveBeenCalledWith(
        'some-plugin-id',
        'some-optional-dep'
      );
      expect(ctx.plugins.pluginInitStatus$('some-optional-dep')).toBe(status$);
      expect(runtimeResolver.pluginInitStatus$).toHaveBeenCalledWith(
        'some-plugin-id',
        'some-optional-dep'
      );
    });
  });

  describe('http.createRouter', () => {
    it('hands a plugin without initialize() the raw router', () => {
      const deps = coreInternalLifecycleMock.createInternalSetup();
      const ctx = createPluginSetupContext({
        deps,
        plugin: createPlugin(createPluginManifest({ hasInitialization: false })),
        runtimeResolver: createRuntimeResolver(),
        deferredInitEngine,
      });
      const rawRouter = deps.http.createRouter.mock.results[0].value;

      expect(ctx.http.createRouter()).toBe(rawRouter);
    });

    it('hands a plugin with initialize() a guarded router that answers 503 until the plugin is available', async () => {
      const plugin = createPlugin(createPluginManifest({ hasInitialization: true }));
      deferredInitEngine.register(plugin.name);
      deferredInitEngine.setRunner(plugin.name, jest.fn().mockResolvedValue(undefined));
      const deps = coreInternalLifecycleMock.createInternalSetup();
      const ctx = createPluginSetupContext({
        deps,
        plugin,
        runtimeResolver: createRuntimeResolver(),
        deferredInitEngine,
      });
      const rawRouter = deps.http.createRouter.mock.results[0].value;

      const router = ctx.http.createRouter();
      expect(router).not.toBe(rawRouter);
      expect(ctx.http.createRouter()).toBe(router);
      // Asset serving is never gated: the browser needs the plugin's bundles to render the gate.
      expect(deps.httpResources.createRegistrar).toHaveBeenCalledWith(rawRouter);

      const handler = jest.fn().mockReturnValue('ok');
      router.get({ path: '/foo' } as never, handler);
      const [, gated] = (rawRouter.get as jest.Mock).mock.calls[0] as [unknown, RequestHandler];
      const request = mockRouter.createKibanaRequest();

      const whileInitializing = mockRouter.createResponseFactory();
      await gated({} as never, request, whileInitializing);
      expect(handler).not.toHaveBeenCalled();
      expect(whileInitializing.custom).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          body: { pluginId: 'some-plugin-id', status: 'initializing' },
        })
      );

      await deferredInitEngine.initialize(plugin.name);
      const onceAvailable = mockRouter.createResponseFactory();
      expect(await gated({} as never, request, onceAvailable)).toBe('ok');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(onceAvailable.custom).not.toHaveBeenCalled();
    });
  });
});

describe('plugin context service accounts', () => {
  let plugin: PluginWrapper;
  let runtimeResolver: ReturnType<typeof createRuntimePluginContractResolverMock>;

  beforeEach(() => {
    const manifest = createPluginManifest();
    const opaqueId = Symbol();
    plugin = new PluginWrapper({
      path: 'some-path',
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext({
        coreContext: mockCoreContext.create(),
        opaqueId,
        manifest,
        instanceInfo: { uuid: 'instance-uuid', airgapped: false },
        nodeInfo: nodeServiceMock.createInternalPrebootContract(),
        deferredInitEngine: new DeferredInitEngine(loggingSystemMock.createLogger()),
      }),
    });
    runtimeResolver = createRuntimePluginContractResolverMock();
  });

  it('registers workload types with plugin.name during setup', () => {
    const coreSetup = coreInternalLifecycleMock.createInternalSetup();
    const setupContext = createPluginSetupContext({ deps: coreSetup, plugin, runtimeResolver });
    const registration = { type: 'rule', name: 'Alerting rule', description: 'Runs a rule' };

    setupContext.security.serviceAccounts.registerWorkloadType(registration);

    expect(coreSetup.security.serviceAccounts.registerWorkloadType).toHaveBeenCalledTimes(1);
    expect(coreSetup.security.serviceAccounts.registerWorkloadType).toHaveBeenCalledWith(
      'some-plugin-id',
      registration
    );
  });

  it('exposes the service accounts contract scoped to plugin.name at start', () => {
    const coreStart = coreInternalLifecycleMock.createInternalStart();
    const scopedServiceAccounts = securityServiceMock.createServiceAccounts();
    coreStart.security.serviceAccounts.asScopedToPlugin.mockReturnValue(scopedServiceAccounts);

    const startContext = createPluginStartContext({ deps: coreStart, plugin, runtimeResolver });

    expect(coreStart.security.serviceAccounts.asScopedToPlugin).toHaveBeenCalledTimes(1);
    expect(coreStart.security.serviceAccounts.asScopedToPlugin).toHaveBeenCalledWith(
      'some-plugin-id'
    );
    expect(startContext.security.serviceAccounts).toBe(scopedServiceAccounts);
  });
});
