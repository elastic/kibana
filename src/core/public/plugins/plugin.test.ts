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
import { mockInitializer, mockPlugin, mockPluginLoader } from './plugin.test.mocks';

import { DiscoveredPlugin } from '../../server';
import { PluginWrapper } from './plugin';

function createManifest(
  id: string,
  { required = [], optional = [] }: { required?: string[]; optional?: string[]; ui?: boolean } = {}
) {
  return {
    id,
    version: 'some-version',
    configPath: ['path'],
    requiredPlugins: required,
    optionalPlugins: optional,
  } as DiscoveredPlugin;
}

let plugin: PluginWrapper<unknown, Record<string, unknown>>;
const initializerContext = {};
const addBasePath = (path: string) => path;

beforeEach(() => {
  mockPluginLoader.mockClear();
  mockPlugin.setup.mockClear();
  mockPlugin.start.mockClear();
  mockPlugin.stop.mockClear();
  plugin = new PluginWrapper(createManifest('plugin-a'), initializerContext);
});

describe('PluginWrapper', () => {
  test('`load` calls loadPluginBundle', () => {
    plugin.load(addBasePath);
    expect(mockPluginLoader).toHaveBeenCalledWith(addBasePath, 'plugin-a');
  });

  test('`setup` fails if load is not called first', async () => {
    await expect(plugin.setup({} as any, {} as any)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Plugin \\"plugin-a\\" can't be setup since its bundle isn't loaded."`
    );
  });

  test('`setup` fails if plugin.setup is not a function', async () => {
    mockInitializer.mockReturnValueOnce({ start: jest.fn() } as any);
    await plugin.load(addBasePath);
    await expect(plugin.setup({} as any, {} as any)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Instance of plugin \\"plugin-a\\" does not define \\"setup\\" function."`
    );
  });

  test('`setup` fails if plugin.start is not a function', async () => {
    mockInitializer.mockReturnValueOnce({ setup: jest.fn() } as any);
    await plugin.load(addBasePath);
    await expect(plugin.setup({} as any, {} as any)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Instance of plugin \\"plugin-a\\" does not define \\"start\\" function."`
    );
  });

  test('`setup` calls initializer with initializer context', async () => {
    await plugin.load(addBasePath);
    await plugin.setup({} as any, {} as any);
    expect(mockInitializer).toHaveBeenCalledWith(initializerContext);
  });

  test('`setup` calls plugin.setup with context and dependencies', async () => {
    await plugin.load(addBasePath);
    const context = { any: 'thing' } as any;
    const deps = { otherDep: 'value' };
    await plugin.setup(context, deps);
    expect(mockPlugin.setup).toHaveBeenCalledWith(context, deps);
  });

  test('`start` fails if setup is not called first', async () => {
    await plugin.load(addBasePath);
    await expect(plugin.start({} as any, {} as any)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Plugin \\"plugin-a\\" can't be started since it isn't set up."`
    );
  });

  test('`start` calls plugin.start with context and dependencies', async () => {
    await plugin.load(addBasePath);
    await plugin.setup({} as any, {} as any);
    const context = { any: 'thing' } as any;
    const deps = { otherDep: 'value' };
    await plugin.start(context, deps);
    expect(mockPlugin.start).toHaveBeenCalledWith(context, deps);
  });

  test('`stop` fails if plugin is not setup up', async () => {
    expect(() => plugin.stop()).toThrowErrorMatchingInlineSnapshot(
      `"Plugin \\"plugin-a\\" can't be stopped since it isn't set up."`
    );
  });

  test('`stop` calls plugin.stop', async () => {
    await plugin.load(addBasePath);
    await plugin.setup({} as any, {} as any);
    await plugin.stop();
    expect(mockPlugin.stop).toHaveBeenCalled();
  });

  test('`stop` does not fail if plugin.stop does not exist', async () => {
    mockInitializer.mockReturnValueOnce({ setup: jest.fn(), start: jest.fn() } as any);
    await plugin.load(addBasePath);
    await plugin.setup({} as any, {} as any);
    expect(() => plugin.stop()).not.toThrow();
  });
});
