/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContainerModule } from 'inversify';
import { join } from 'path';
import { BehaviorSubject } from 'rxjs';
import { runInThisContext } from 'vm';
import { REPO_ROOT } from '@kbn/repo-info';
import { schema } from '@kbn/config-schema';
import { Env } from '@kbn/config';

import { configServiceMock, getEnvOptions } from '@kbn/config-mocks';
import type { CoreContext } from '@kbn/core-base-server-internal';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { NodeInfo } from '@kbn/core-node-server';
import { nodeServiceMock } from '@kbn/core-node-server-mocks';
import type { PluginManifest } from '@kbn/core-plugins-server';
import { PluginType } from '@kbn/core-base-common';
import { coreInternalLifecycleMock } from '@kbn/core-lifecycle-server-mocks';
import { PluginSetup, PluginStart, Setup, Start } from '@kbn/core-di';
import { CoreSetup, CoreStart, PluginInitializer } from '@kbn/core-di-server';
import { createRuntimePluginContractResolverMock } from './test_helpers';
import { PluginWrapper } from './plugin';
import { PluginsTelemetry } from './plugins_telemetry';

import type { InstanceInfo } from './plugin_context';
import {
  createPluginInitializerContext,
  createPluginSetupContext,
  createPluginStartContext,
} from './plugin_context';

const mockPluginInitializer = jest.fn();
const mockContainerModuleCallback: jest.MockedFunction<
  ConstructorParameters<typeof ContainerModule>[0]
> = jest.fn();
const pluginModule = new ContainerModule(mockContainerModuleCallback);
const logger = loggingSystemMock.create();
jest.doMock(
  join('plugin-with-initializer-path', 'server'),
  () => ({ plugin: mockPluginInitializer }),
  { virtual: true }
);
jest.doMock(join('plugin-without-initializer-path', 'server'), () => ({}), {
  virtual: true,
});
jest.doMock(join('plugin-with-wrong-initializer-path', 'server'), () => ({ plugin: {} }), {
  virtual: true,
});
jest.doMock(join('plugin-with-module', 'server'), () => ({ module: pluginModule }), {
  virtual: true,
});

const OSS_PLUGIN_PATH_POSIX = '/kibana/src/plugins/ossPlugin';
const OSS_PLUGIN_PATH_WINDOWS = 'C:\\kibana\\src\\plugins\\ossPlugin';
const XPACK_PLUGIN_PATH_POSIX = '/kibana/x-pack/plugins/xPackPlugin';
const XPACK_PLUGIN_PATH_WINDOWS = 'C:\\kibana\\x-pack\\plugins\\xPackPlugin';

function createPluginManifest(manifestProps: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'some-plugin-id',
    version: 'some-version',
    configPath: 'path',
    kibanaVersion: '7.0.0',
    type: PluginType.standard,
    requiredPlugins: ['some-required-dep'],
    optionalPlugins: ['some-optional-dep'],
    requiredBundles: [],
    runtimePluginDependencies: ['some-runtime-dep'],
    server: true,
    ui: true,
    owner: { name: 'Core' },
    ...manifestProps,
  };
}

const configService = configServiceMock.create();
configService.atPath.mockReturnValue(new BehaviorSubject({ initialize: true }));

let coreId: symbol;
let env: Env;
let coreContext: CoreContext;
let instanceInfo: InstanceInfo;
let nodeInfo: NodeInfo;
let runtimeResolver: ReturnType<typeof createRuntimePluginContractResolverMock>;
let initialization: PromiseWithResolvers<void>;

const setupDeps = coreInternalLifecycleMock.createInternalSetup();

beforeEach(() => {
  coreId = Symbol('core');
  env = Env.createDefault(REPO_ROOT, getEnvOptions());
  instanceInfo = {
    uuid: 'instance-uuid',
    airgapped: false,
  };
  nodeInfo = nodeServiceMock.createInternalPrebootContract();
  runtimeResolver = createRuntimePluginContractResolverMock();
  initialization = Promise.withResolvers<void>();
  coreContext = { coreId, env, logger, configService: configService as any };
});

afterEach(() => {
  jest.clearAllMocks();
});

test('`constructor` correctly initializes plugin instance', () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'some-plugin-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });

  expect(plugin.name).toBe('some-plugin-id');
  expect(plugin.configPath).toBe('path');
  expect(plugin.path).toBe('some-plugin-path');
  expect(plugin.source).toBe('external'); // see below for test cases for non-external sources (OSS and X-Pack)
  expect(plugin.requiredPlugins).toEqual(['some-required-dep']);
  expect(plugin.optionalPlugins).toEqual(['some-optional-dep']);
  expect(plugin.runtimePluginDependencies).toEqual(['some-runtime-dep']);
});

describe('`constructor` correctly sets non-external source', () => {
  function createPlugin(path: string) {
    const manifest = createPluginManifest();
    const opaqueId = Symbol();
    return new PluginWrapper({
      path,
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext({
        coreContext,
        opaqueId,
        manifest,
        instanceInfo,
        nodeInfo,
        initialization,
      }),
      initialization,
    });
  }

  test('for OSS plugin in POSIX', () => {
    const plugin = createPlugin(OSS_PLUGIN_PATH_POSIX);
    expect(plugin.source).toBe('oss');
  });

  test('for OSS plugin in Windows', () => {
    const plugin = createPlugin(OSS_PLUGIN_PATH_WINDOWS);
    expect(plugin.source).toBe('oss');
  });

  test('for X-Pack plugin in POSIX', () => {
    const plugin = createPlugin(XPACK_PLUGIN_PATH_POSIX);
    expect(plugin.source).toBe('x-pack');
  });

  test('for X-Pack plugin in Windows', () => {
    const plugin = createPlugin(XPACK_PLUGIN_PATH_WINDOWS);
    expect(plugin.source).toBe('x-pack');
  });
});

test('`setup` fails if the plugin has not been initialized', () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-without-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });

  expect(() =>
    plugin.setup(createPluginSetupContext({ deps: setupDeps, plugin, runtimeResolver }), {})
  ).toThrowErrorMatchingInlineSnapshot(
    `"The plugin is not initialized. Call the init method first."`
  );
});

test('`init` fails if no `plugin` initializer nor `module` is exported', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-without-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });

  await expect(() => plugin.init()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Plugin \\"some-plugin-id\\" does not export the \\"plugin\\" definition or \\"module\\" (plugin-without-initializer-path)."`
  );
});

test('`init` fails if plugin initializer is not a function', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-wrong-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });

  await expect(() => plugin.init()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Definition of plugin \\"some-plugin-id\\" should be a function (plugin-with-wrong-initializer-path)."`
  );
});

test('`init` fails if initializer does not return object', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });

  mockPluginInitializer.mockResolvedValue(null);

  await expect(() => plugin.init()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Initializer for plugin \\"some-plugin-id\\" is expected to return plugin instance, but returned \\"null\\"."`
  );
});

test('`init` fails if object returned from initializer does not define `setup` function', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });

  const mockPluginInstance = { run: jest.fn() };
  mockPluginInitializer.mockResolvedValue(mockPluginInstance);

  await expect(() => plugin.init()).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Instance of plugin \\"some-plugin-id\\" does not define \\"setup\\" function."`
  );
});

describe('initialize', () => {
  const createPlugin = () => {
    const manifest = createPluginManifest();
    const opaqueId = Symbol();
    return new PluginWrapper({
      path: 'plugin-with-initializer-path',
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext({
        coreContext,
        opaqueId,
        manifest,
        instanceInfo,
        nodeInfo,
        initialization,
      }),
      initialization,
    });
  };

  test('`runInitialize` calls `initialize` with the start arguments and resolves the initialization', async () => {
    const plugin = createPlugin();
    const context = { any: 'thing' } as any;
    const deps = { otherDep: 'value' };
    class PluginWithInitializeMethod {
      public readonly initializeCalls: unknown[][] = [];

      setup() {
        return {};
      }

      start() {
        return {};
      }

      async initialize(...args: unknown[]) {
        this.initializeCalls.push(args);
      }
    }
    const instance = new PluginWithInitializeMethod();
    mockPluginInitializer.mockResolvedValue(instance);

    await plugin.init();
    plugin.runInitialize(context, deps);

    await expect(initialization.promise).resolves.toBeUndefined();
    expect(instance.initializeCalls).toEqual([[context, deps]]);
  });

  describe('`runInitialize` when `initialize` fails', () => {
    const cause = new Error('boom');

    /**
     * Returns the unhandled rejections Node reports while `run` executes. Jest gives tests a copy of
     * `process` whose listeners never fire, and fails any test that leaves a rejection unhandled, so
     * this replaces the real process's listeners with its own until `run` has finished.
     */
    const collectUnhandledRejections = async (run: () => Promise<void>): Promise<unknown[]> => {
      const realProcess: NodeJS.Process = runInThisContext('process');
      const jestListeners = realProcess.listeners('unhandledRejection');
      const rejections: unknown[] = [];
      realProcess.removeAllListeners('unhandledRejection');
      realProcess.on('unhandledRejection', (reason) => rejections.push(reason));
      try {
        await run();
        // Node reports unhandled rejections once the microtask queue drains, before `setImmediate` runs.
        await new Promise((resolve) => setImmediate(resolve));
      } finally {
        realProcess.removeAllListeners('unhandledRejection');
        jestListeners.forEach((listener) => realProcess.on('unhandledRejection', listener));
      }
      return rejections;
    };

    beforeEach(() => {
      mockPluginInitializer.mockResolvedValue({
        setup: jest.fn(),
        start: jest.fn(),
        initialize: jest.fn().mockRejectedValue(cause),
      });
    });

    test('rejects the initialization with the original error and reports no unhandled rejection when awaited', async () => {
      const plugin = createPlugin();
      await plugin.init();

      const rejections = await collectUnhandledRejections(async () => {
        plugin.runInitialize({} as any, {});
        await expect(initialization.promise).rejects.toBe(cause);
      });

      expect(rejections).toEqual([]);
    });

    test('reports exactly one unhandled rejection with the original error when nobody awaits the initialization', async () => {
      const plugin = createPlugin();
      await plugin.init();

      const rejections = await collectUnhandledRejections(async () => {
        plugin.runInitialize({} as any, {});
      });

      expect(rejections).toHaveLength(1);
      expect(rejections[0]).toBe(cause);
    });

    test('reports exactly one unhandled rejection with the original error when telemetry measures the run', async () => {
      const plugin = createPlugin();
      const telemetry = new PluginsTelemetry();
      await plugin.init();

      const rejections = await collectUnhandledRejections(async () => {
        plugin.runInitialize({} as any, {}, (run) => telemetry.measureInitialize(plugin, run));
      });

      expect(rejections).toHaveLength(1);
      expect(rejections[0]).toBe(cause);
    });
  });

  test('`runInitialize` calls `initialize` inside `wrapInitialize`', async () => {
    const plugin = createPlugin();
    const calls: string[] = [];
    mockPluginInitializer.mockResolvedValue({
      setup: jest.fn(),
      start: jest.fn(),
      initialize: jest.fn(async () => {
        calls.push('initialize');
      }),
    });

    await plugin.init();
    plugin.runInitialize({} as any, {}, async (run) => {
      calls.push('before');
      await run();
      calls.push('after');
    });

    await expect(initialization.promise).resolves.toBeUndefined();
    expect(calls).toEqual(['before', 'initialize', 'after']);
  });

  test('`runInitialize` resolves the initialization when the plugin does not define `initialize`', async () => {
    const plugin = createPlugin();
    mockPluginInitializer.mockResolvedValue({ setup: jest.fn(), start: jest.fn() });

    await plugin.init();
    plugin.runInitialize({} as any, {});

    await expect(initialization.promise).resolves.toBeUndefined();
  });
});

test('`setup` initializes plugin and calls appropriate lifecycle hook', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const initializerContext = createPluginInitializerContext({
    coreContext,
    opaqueId,
    manifest,
    instanceInfo,
    nodeInfo,
    initialization,
  });
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext,
    initialization,
  });

  const mockPluginInstance = { setup: jest.fn().mockResolvedValue({ contract: 'yes' }) };
  mockPluginInitializer.mockResolvedValue(mockPluginInstance);

  await plugin.init();

  const setupContext = createPluginSetupContext({ deps: setupDeps, plugin, runtimeResolver });
  const setupDependencies = { 'some-required-dep': { contract: 'no' } };
  await expect(plugin.setup(setupContext, setupDependencies)).resolves.toEqual({ contract: 'yes' });

  expect(mockPluginInitializer).toHaveBeenCalledTimes(1);
  expect(mockPluginInitializer).toHaveBeenCalledWith(initializerContext);

  expect(mockPluginInstance.setup).toHaveBeenCalledTimes(1);
  expect(mockPluginInstance.setup).toHaveBeenCalledWith(setupContext, setupDependencies);
});

test('`setup` initializes the plugin container module', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-module',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });

  await plugin.init();

  const setupContext = createPluginSetupContext({
    deps: coreInternalLifecycleMock.createInternalSetup(),
    plugin,
    runtimeResolver,
  });
  const setupDependencies = { 'some-required-dep': { contract: 'no' } };
  mockContainerModuleCallback.mockImplementationOnce(({ bind }) => {
    bind(Setup).toConstantValue({ contract: 'yes' });
  });
  expect(plugin.setup(setupContext, setupDependencies)).toEqual({ contract: 'yes' });

  expect(mockContainerModuleCallback).toHaveBeenCalledTimes(1);

  const container = setupContext.injection.getContainer();
  expect(container.get(PluginInitializer('opaqueId'))).toBe(opaqueId);
  expect(container.get(CoreSetup('injection'))).toBeDefined();
  expect(container.get(PluginSetup('some-required-dep'))).toEqual({ contract: 'no' });
});

test('`start` fails if setup is not called first', () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'some-plugin-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });

  expect(() => plugin.start({} as any, {} as any)).toThrowErrorMatchingInlineSnapshot(
    `"Plugin \\"some-plugin-id\\" can't be started since it isn't set up."`
  );
});

test('`start` fails invoked for the `preboot` plugin', async () => {
  const manifest = createPluginManifest({ type: PluginType.preboot });
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });

  const mockPluginInstance = { setup: jest.fn() };
  mockPluginInitializer.mockResolvedValue(mockPluginInstance);

  await plugin.init();
  await plugin.setup({} as any, {} as any);

  expect(() => plugin.start({} as any, {} as any)).toThrowErrorMatchingInlineSnapshot(
    `"Plugin \\"some-plugin-id\\" is a preboot plugin and cannot be started."`
  );
});

test('`start` calls plugin.start with context and dependencies', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });
  const context = { any: 'thing' } as any;
  const deps = { otherDep: 'value' };

  const pluginStartContract = { contract: 'start-contract' };
  const mockPluginInstance = {
    setup: jest.fn(),
    start: jest.fn().mockResolvedValue(pluginStartContract),
  };
  mockPluginInitializer.mockResolvedValue(mockPluginInstance);

  await plugin.init();
  await plugin.setup({} as any, {} as any);

  const startContract = await plugin.start(context, deps);

  expect(startContract).toBe(pluginStartContract);
  expect(mockPluginInstance.start).toHaveBeenCalledWith(context, deps);
});

test("`start` resolves `startDependencies` Promise after plugin's start", async () => {
  expect.assertions(2);

  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });
  const startContext = { any: 'thing' } as any;
  const pluginDeps = { someDep: 'value' };
  const pluginStartContract = {
    someApi: () => 'foo',
  };

  let startDependenciesResolved = false;

  const mockPluginInstance = {
    setup: jest.fn(),
    start: async () => {
      // delay to ensure startDependencies is not resolved until after the plugin instance's start resolves.
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(startDependenciesResolved).toBe(false);
      return pluginStartContract;
    },
  };
  mockPluginInitializer.mockResolvedValue(mockPluginInstance);

  await plugin.init();
  await plugin.setup({} as any, {} as any);

  const startDependenciesCheck = plugin.startDependencies.then((resolvedStartDeps) => {
    startDependenciesResolved = true;
    expect(resolvedStartDeps).toEqual([startContext, pluginDeps, pluginStartContract]);
  });

  await plugin.start(startContext, pluginDeps);
  await startDependenciesCheck;
});

test('`start` loads start dependencies into the plugin container', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-module',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });
  const setupContext = createPluginSetupContext({
    deps: coreInternalLifecycleMock.createInternalSetup(),
    plugin,
    runtimeResolver,
  });
  const startContext = createPluginStartContext({
    deps: coreInternalLifecycleMock.createInternalStart(),
    plugin,
    runtimeResolver,
  });
  const startDependencies = { someDep: 'value' };
  const startContract = {
    someApi: () => 'foo',
  };

  mockContainerModuleCallback.mockImplementationOnce(({ bind }) => {
    bind(Setup).toConstantValue({});
    bind(Start).toConstantValue(startContract);
  });

  await plugin.init();
  await plugin.setup(setupContext, {} as any);
  expect(plugin.start(startContext, startDependencies)).toBe(startContract);
  const container = setupContext.injection.getContainer();
  expect(container.get(CoreStart('injection'))).toBeDefined();
  expect(container.get(PluginStart('someDep'))).toBe('value');
});

test('`stop` fails if plugin is not set up', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });

  const mockPluginInstance = { setup: jest.fn(), stop: jest.fn() };
  mockPluginInitializer.mockResolvedValue(mockPluginInstance);

  await expect(plugin.stop()).rejects.toMatchInlineSnapshot(
    `[Error: Plugin "some-plugin-id" can't be stopped since it isn't set up.]`
  );
  expect(mockPluginInstance.stop).not.toHaveBeenCalled();
});

test('`stop` does nothing if plugin does not define `stop` function', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });

  mockPluginInitializer.mockResolvedValue({ setup: jest.fn() });
  await plugin.init();
  await plugin.setup(createPluginSetupContext({ deps: setupDeps, plugin, runtimeResolver }), {});

  await expect(plugin.stop()).resolves.toBeUndefined();
});

test('`stop` calls `stop` defined by the plugin instance', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });

  const mockPluginInstance = { setup: jest.fn(), stop: jest.fn() };
  mockPluginInitializer.mockResolvedValue(mockPluginInstance);
  await plugin.init();
  await plugin.setup(createPluginSetupContext({ deps: setupDeps, plugin, runtimeResolver }), {});

  await expect(plugin.stop()).resolves.toBeUndefined();
  expect(mockPluginInstance.stop).toHaveBeenCalledTimes(1);
});

test('`stop` cleans up the plugin container', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-module',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext({
      coreContext,
      opaqueId,
      manifest,
      instanceInfo,
      nodeInfo,
      initialization,
    }),
    initialization,
  });

  await plugin.init();

  const setupContext = createPluginSetupContext({
    deps: coreInternalLifecycleMock.createInternalSetup(),
    plugin,
    runtimeResolver,
  });
  const setupDependencies = { 'some-required-dep': { contract: 'no' } };
  mockContainerModuleCallback.mockImplementationOnce(({ bind }) => {
    bind(Setup).toConstantValue({ contract: 'yes' });
  });
  expect(plugin.setup(setupContext, setupDependencies)).toEqual({ contract: 'yes' });

  const container = setupContext.injection.getContainer();
  expect(container.isBound(CoreSetup('injection'))).toBe(true);
  await plugin.stop();
  expect(container.isBound(CoreSetup('injection'))).toBe(false);
});

describe('#getConfigSchema()', () => {
  it('reads config schema from plugin', async () => {
    const pluginSchema = schema.any();
    const configDescriptor = {
      schema: pluginSchema,
    };
    jest.doMock(
      join('plugin-with-schema', 'server'),
      () => ({
        config: configDescriptor,
      }),
      { virtual: true }
    );
    const manifest = createPluginManifest();
    const opaqueId = Symbol();
    const plugin = new PluginWrapper({
      path: 'plugin-with-schema',
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext({
        coreContext,
        opaqueId,
        manifest,
        instanceInfo,
        nodeInfo,
        initialization,
      }),
      initialization,
    });

    expect(await plugin.getConfigDescriptor()).toBe(configDescriptor);
  });

  it('returns null if config definition not specified', async () => {
    jest.doMock(join('plugin-with-no-definition', 'server'), () => ({}), { virtual: true });
    const manifest = createPluginManifest();
    const opaqueId = Symbol();
    const plugin = new PluginWrapper({
      path: 'plugin-with-no-definition',
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext({
        coreContext,
        opaqueId,
        manifest,
        instanceInfo,
        nodeInfo,
        initialization,
      }),
      initialization,
    });
    expect(await plugin.getConfigDescriptor()).toBe(null);
  });

  it('returns null for plugins without a server part', async () => {
    const manifest = createPluginManifest({ server: false });
    const opaqueId = Symbol();
    const plugin = new PluginWrapper({
      path: 'plugin-with-no-definition',
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext({
        coreContext,
        opaqueId,
        manifest,
        instanceInfo,
        nodeInfo,
        initialization,
      }),
      initialization,
    });
    expect(await plugin.getConfigDescriptor()).toBe(null);
  });

  it('throws if plugin contains invalid schema', async () => {
    jest.doMock(
      join('plugin-invalid-schema', 'server'),
      () => ({
        config: {
          schema: {
            validate: () => null,
          },
        },
      }),
      { virtual: true }
    );
    const manifest = createPluginManifest();
    const opaqueId = Symbol();
    const plugin = new PluginWrapper({
      path: 'plugin-invalid-schema',
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext({
        coreContext,
        opaqueId,
        manifest,
        instanceInfo,
        nodeInfo,
        initialization,
      }),
      initialization,
    });
    await expect(() => plugin.getConfigDescriptor()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Configuration schema expected to be an instance of Type"`
    );
  });
});
