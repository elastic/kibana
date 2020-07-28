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

import { join } from 'path';
import { BehaviorSubject } from 'rxjs';
import { schema } from '@kbn/config-schema';

import { Env } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { CoreContext } from '../core_context';
import { coreMock } from '../mocks';
import { configServiceMock } from '../config/config_service.mock';
import { loggingSystemMock } from '../logging/logging_system.mock';

import { PluginWrapper } from './plugin';
import { PluginManifest } from './types';
import { createPluginInitializerContext, createPluginSetupContext } from './plugin_context';

const mockPluginInitializer = jest.fn();
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

function createPluginManifest(manifestProps: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: 'some-plugin-id',
    version: 'some-version',
    configPath: 'path',
    kibanaVersion: '7.0.0',
    requiredPlugins: ['some-required-dep'],
    optionalPlugins: ['some-optional-dep'],
    requiredBundles: [],
    server: true,
    ui: true,
    ...manifestProps,
  };
}

const configService = configServiceMock.create();
configService.atPath.mockReturnValue(new BehaviorSubject({ initialize: true }));

let coreId: symbol;
let env: Env;
let coreContext: CoreContext;

const setupDeps = coreMock.createInternalSetup();

beforeEach(() => {
  coreId = Symbol('core');
  env = Env.createDefault(getEnvOptions());

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
    initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest),
  });

  expect(plugin.name).toBe('some-plugin-id');
  expect(plugin.configPath).toBe('path');
  expect(plugin.path).toBe('some-plugin-path');
  expect(plugin.requiredPlugins).toEqual(['some-required-dep']);
  expect(plugin.optionalPlugins).toEqual(['some-optional-dep']);
});

test('`setup` fails if `plugin` initializer is not exported', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-without-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest),
  });

  await expect(
    plugin.setup(createPluginSetupContext(coreContext, setupDeps, plugin), {})
  ).rejects.toMatchInlineSnapshot(
    `[Error: Plugin "some-plugin-id" does not export "plugin" definition (plugin-without-initializer-path).]`
  );
});

test('`setup` fails if plugin initializer is not a function', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-wrong-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest),
  });

  await expect(
    plugin.setup(createPluginSetupContext(coreContext, setupDeps, plugin), {})
  ).rejects.toMatchInlineSnapshot(
    `[Error: Definition of plugin "some-plugin-id" should be a function (plugin-with-wrong-initializer-path).]`
  );
});

test('`setup` fails if initializer does not return object', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest),
  });

  mockPluginInitializer.mockReturnValue(null);

  await expect(
    plugin.setup(createPluginSetupContext(coreContext, setupDeps, plugin), {})
  ).rejects.toMatchInlineSnapshot(
    `[Error: Initializer for plugin "some-plugin-id" is expected to return plugin instance, but returned "null".]`
  );
});

test('`setup` fails if object returned from initializer does not define `setup` function', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest),
  });

  const mockPluginInstance = { run: jest.fn() };
  mockPluginInitializer.mockReturnValue(mockPluginInstance);

  await expect(
    plugin.setup(createPluginSetupContext(coreContext, setupDeps, plugin), {})
  ).rejects.toMatchInlineSnapshot(
    `[Error: Instance of plugin "some-plugin-id" does not define "setup" function.]`
  );
});

test('`setup` initializes plugin and calls appropriate lifecycle hook', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const initializerContext = createPluginInitializerContext(coreContext, opaqueId, manifest);
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext,
  });

  const mockPluginInstance = { setup: jest.fn().mockResolvedValue({ contract: 'yes' }) };
  mockPluginInitializer.mockReturnValue(mockPluginInstance);

  const setupContext = createPluginSetupContext(coreContext, setupDeps, plugin);
  const setupDependencies = { 'some-required-dep': { contract: 'no' } };
  await expect(plugin.setup(setupContext, setupDependencies)).resolves.toEqual({ contract: 'yes' });

  expect(mockPluginInitializer).toHaveBeenCalledTimes(1);
  expect(mockPluginInitializer).toHaveBeenCalledWith(initializerContext);

  expect(mockPluginInstance.setup).toHaveBeenCalledTimes(1);
  expect(mockPluginInstance.setup).toHaveBeenCalledWith(setupContext, setupDependencies);
});

test('`start` fails if setup is not called first', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'some-plugin-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest),
  });

  await expect(plugin.start({} as any, {} as any)).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Plugin \\"some-plugin-id\\" can't be started since it isn't set up."`
  );
});

test('`start` calls plugin.start with context and dependencies', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest),
  });
  const context = { any: 'thing' } as any;
  const deps = { otherDep: 'value' };

  const pluginStartContract = { contract: 'start-contract' };
  const mockPluginInstance = {
    setup: jest.fn(),
    start: jest.fn().mockResolvedValue(pluginStartContract),
  };
  mockPluginInitializer.mockReturnValue(mockPluginInstance);

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
    initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest),
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
  mockPluginInitializer.mockReturnValue(mockPluginInstance);

  await plugin.setup({} as any, {} as any);

  const startDependenciesCheck = plugin.startDependencies.then((resolvedStartDeps) => {
    startDependenciesResolved = true;
    expect(resolvedStartDeps).toEqual([startContext, pluginDeps, pluginStartContract]);
  });

  await plugin.start(startContext, pluginDeps);
  await startDependenciesCheck;
});

test('`stop` fails if plugin is not set up', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest),
  });

  const mockPluginInstance = { setup: jest.fn(), stop: jest.fn() };
  mockPluginInitializer.mockReturnValue(mockPluginInstance);

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
    initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest),
  });

  mockPluginInitializer.mockReturnValue({ setup: jest.fn() });
  await plugin.setup(createPluginSetupContext(coreContext, setupDeps, plugin), {});

  await expect(plugin.stop()).resolves.toBeUndefined();
});

test('`stop` calls `stop` defined by the plugin instance', async () => {
  const manifest = createPluginManifest();
  const opaqueId = Symbol();
  const plugin = new PluginWrapper({
    path: 'plugin-with-initializer-path',
    manifest,
    opaqueId,
    initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest),
  });

  const mockPluginInstance = { setup: jest.fn(), stop: jest.fn() };
  mockPluginInitializer.mockReturnValue(mockPluginInstance);
  await plugin.setup(createPluginSetupContext(coreContext, setupDeps, plugin), {});

  await expect(plugin.stop()).resolves.toBeUndefined();
  expect(mockPluginInstance.stop).toHaveBeenCalledTimes(1);
});

describe('#getConfigSchema()', () => {
  it('reads config schema from plugin', () => {
    const pluginSchema = schema.any();
    const configDescriptor = {
      schema: pluginSchema,
    };
    jest.doMock(
      'plugin-with-schema/server',
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
      initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest),
    });

    expect(plugin.getConfigDescriptor()).toBe(configDescriptor);
  });

  it('returns null if config definition not specified', () => {
    jest.doMock('plugin-with-no-definition/server', () => ({}), { virtual: true });
    const manifest = createPluginManifest();
    const opaqueId = Symbol();
    const plugin = new PluginWrapper({
      path: 'plugin-with-no-definition',
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest),
    });
    expect(plugin.getConfigDescriptor()).toBe(null);
  });

  it('returns null for plugins without a server part', () => {
    const manifest = createPluginManifest({ server: false });
    const opaqueId = Symbol();
    const plugin = new PluginWrapper({
      path: 'plugin-with-no-definition',
      manifest,
      opaqueId,
      initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest),
    });
    expect(plugin.getConfigDescriptor()).toBe(null);
  });

  it('throws if plugin contains invalid schema', () => {
    jest.doMock(
      'plugin-invalid-schema/server',
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
      initializerContext: createPluginInitializerContext(coreContext, opaqueId, manifest),
    });
    expect(() => plugin.getConfigDescriptor()).toThrowErrorMatchingInlineSnapshot(
      `"Configuration schema expected to be an instance of Type"`
    );
  });
});
