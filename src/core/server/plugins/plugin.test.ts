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
import { CoreContext } from '../../types';
import { Config, ConfigService, Env, ObjectToConfigAdapter } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { logger } from '../logging/__mocks__';
import { Plugin, PluginManifest } from './plugin';
import { createPluginInitializerContext, createPluginStartContext } from './plugin_context';

const mockPluginInitializer = jest.fn();
jest.mock(
  join('plugin-with-initializer-path', 'server'),
  () => ({ plugin: mockPluginInitializer }),
  { virtual: true }
);
jest.mock(join('plugin-without-initializer-path', 'server'), () => ({}), {
  virtual: true,
});
jest.mock(join('plugin-with-wrong-initializer-path', 'server'), () => ({ plugin: {} }), {
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
    server: true,
    ui: true,
    ...manifestProps,
  };
}

let configService: ConfigService;
let env: Env;
let coreContext: CoreContext;
beforeEach(() => {
  env = Env.createDefault(getEnvOptions());

  configService = new ConfigService(
    new BehaviorSubject<Config>(new ObjectToConfigAdapter({ plugins: { initialize: true } })),
    env,
    logger
  );

  coreContext = { env, logger, configService };
});

afterEach(() => {
  jest.clearAllMocks();
});

test('`constructor` correctly initializes plugin instance', () => {
  const manifest = createPluginManifest();
  const plugin = new Plugin(
    'some-plugin-path',
    manifest,
    createPluginInitializerContext(coreContext, manifest)
  );

  expect(plugin.name).toBe('some-plugin-id');
  expect(plugin.configPath).toBe('path');
  expect(plugin.path).toBe('some-plugin-path');
  expect(plugin.requiredDependencies).toEqual(['some-required-dep']);
  expect(plugin.optionalDependencies).toEqual(['some-optional-dep']);
});

test('`start` fails if `plugin` initializer is not exported', async () => {
  const manifest = createPluginManifest();
  const plugin = new Plugin(
    'plugin-without-initializer-path',
    manifest,
    createPluginInitializerContext(coreContext, manifest)
  );

  await expect(
    plugin.start(createPluginStartContext(coreContext, plugin), {})
  ).rejects.toMatchInlineSnapshot(
    `[Error: Plugin "some-plugin-id" does not export "plugin" definition (plugin-without-initializer-path).]`
  );
});

test('`start` fails if plugin initializer is not a function', async () => {
  const manifest = createPluginManifest();
  const plugin = new Plugin(
    'plugin-with-wrong-initializer-path',
    manifest,
    createPluginInitializerContext(coreContext, manifest)
  );

  await expect(
    plugin.start(createPluginStartContext(coreContext, plugin), {})
  ).rejects.toMatchInlineSnapshot(
    `[Error: Definition of plugin "some-plugin-id" should be a function (plugin-with-wrong-initializer-path).]`
  );
});

test('`start` fails if initializer does not return object', async () => {
  const manifest = createPluginManifest();
  const plugin = new Plugin(
    'plugin-with-initializer-path',
    manifest,
    createPluginInitializerContext(coreContext, manifest)
  );

  mockPluginInitializer.mockReturnValue(null);

  await expect(
    plugin.start(createPluginStartContext(coreContext, plugin), {})
  ).rejects.toMatchInlineSnapshot(
    `[Error: Initializer for plugin "some-plugin-id" is expected to return plugin instance, but returned "null".]`
  );
});

test('`start` fails if object returned from initializer does not define `start` function', async () => {
  const manifest = createPluginManifest();
  const plugin = new Plugin(
    'plugin-with-initializer-path',
    manifest,
    createPluginInitializerContext(coreContext, manifest)
  );

  const mockPluginInstance = { run: jest.fn() };
  mockPluginInitializer.mockReturnValue(mockPluginInstance);

  await expect(
    plugin.start(createPluginStartContext(coreContext, plugin), {})
  ).rejects.toMatchInlineSnapshot(
    `[Error: Instance of plugin "some-plugin-id" does not define "start" function.]`
  );
});

test('`start` initializes plugin and calls appropriate lifecycle hook', async () => {
  const manifest = createPluginManifest();
  const initializerContext = createPluginInitializerContext(coreContext, manifest);
  const plugin = new Plugin('plugin-with-initializer-path', manifest, initializerContext);

  const mockPluginInstance = { start: jest.fn().mockResolvedValue({ contract: 'yes' }) };
  mockPluginInitializer.mockReturnValue(mockPluginInstance);

  const startContext = createPluginStartContext(coreContext, plugin);
  const startDependencies = { 'some-required-dep': { contract: 'no' } };
  await expect(plugin.start(startContext, startDependencies)).resolves.toEqual({ contract: 'yes' });

  expect(mockPluginInitializer).toHaveBeenCalledTimes(1);
  expect(mockPluginInitializer).toHaveBeenCalledWith(initializerContext);

  expect(mockPluginInstance.start).toHaveBeenCalledTimes(1);
  expect(mockPluginInstance.start).toHaveBeenCalledWith(startContext, startDependencies);
});

test('`stop` fails if plugin is not started', async () => {
  const manifest = createPluginManifest();
  const plugin = new Plugin(
    'plugin-with-initializer-path',
    manifest,
    createPluginInitializerContext(coreContext, manifest)
  );

  const mockPluginInstance = { start: jest.fn(), stop: jest.fn() };
  mockPluginInitializer.mockReturnValue(mockPluginInstance);

  await expect(plugin.stop()).rejects.toMatchInlineSnapshot(
    `[Error: Plugin "some-plugin-id" can't be stopped since it isn't started.]`
  );
  expect(mockPluginInstance.stop).not.toHaveBeenCalled();
});

test('`stop` does nothing if plugin does not define `stop` function', async () => {
  const manifest = createPluginManifest();
  const plugin = new Plugin(
    'plugin-with-initializer-path',
    manifest,
    createPluginInitializerContext(coreContext, manifest)
  );

  mockPluginInitializer.mockReturnValue({ start: jest.fn() });
  await plugin.start(createPluginStartContext(coreContext, plugin), {});

  await expect(plugin.stop()).resolves.toBeUndefined();
});

test('`stop` calls `stop` defined by the plugin instance', async () => {
  const manifest = createPluginManifest();
  const plugin = new Plugin(
    'plugin-with-initializer-path',
    manifest,
    createPluginInitializerContext(coreContext, manifest)
  );

  const mockPluginInstance = { start: jest.fn(), stop: jest.fn() };
  mockPluginInitializer.mockReturnValue(mockPluginInstance);
  await plugin.start(createPluginStartContext(coreContext, plugin), {});

  await expect(plugin.stop()).resolves.toBeUndefined();
  expect(mockPluginInstance.stop).toHaveBeenCalledTimes(1);
});
