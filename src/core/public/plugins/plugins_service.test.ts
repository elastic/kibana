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

import { omit } from 'lodash';

import {
  MockedPluginInitializer,
  mockLoadPluginBundle,
  mockPluginInitializerProvider,
} from './plugins_service.test.mocks';

import { PluginName } from 'src/core/server';
import { CoreContext } from '../core_system';
import { PluginsService } from './plugins_service';

export let mockPluginInitializers: Map<PluginName, MockedPluginInitializer>;

mockPluginInitializerProvider.mockImplementation(
  pluginName => mockPluginInitializers.get(pluginName)!
);

const mockCoreContext: CoreContext = {};
let mockDeps: any;
let mockInitContext: any;

beforeEach(() => {
  mockDeps = {
    injectedMetadata: {
      getPlugins: jest.fn(() => [
        { id: 'pluginA', plugin: createManifest('pluginA') },
        { id: 'pluginB', plugin: createManifest('pluginB', { required: ['pluginA'] }) },
        {
          id: 'pluginC',
          plugin: createManifest('pluginC', { required: ['pluginA'], optional: ['nonexist'] }),
        },
      ]),
    },
    basePath: {
      addToPath(path: string) {
        return path;
      },
    },
    chrome: {},
    fatalErrors: {},
    i18n: {},
    notifications: {},
    uiSettings: {},
  } as any;
  mockInitContext = omit(mockDeps, 'injectedMetadata');

  // Reset these for each test.
  mockPluginInitializers = new Map<PluginName, MockedPluginInitializer>(([
    [
      'pluginA',
      jest.fn(() => ({
        setup: jest.fn(() => ({ exportedValue: 1 })),
        stop: jest.fn(),
      })),
    ],
    [
      'pluginB',
      jest.fn(() => ({
        setup: jest.fn((core, deps: any) => ({
          pluginAPlusB: deps.pluginA.exportedValue + 1,
        })),
        stop: jest.fn(),
      })),
    ],
    [
      'pluginC',
      jest.fn(() => ({
        setup: jest.fn(),
        stop: jest.fn(),
      })),
    ],
  ] as unknown) as [[PluginName, any]]);
});

afterEach(() => {
  mockLoadPluginBundle.mockClear();
});

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
  };
}

test('`PluginsService.setup` fails if any bundle cannot be loaded', async () => {
  mockLoadPluginBundle.mockRejectedValueOnce(new Error('Could not load bundle'));

  const pluginsService = new PluginsService(mockCoreContext);
  await expect(pluginsService.setup(mockDeps)).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Could not load bundle"`
  );
});

test('`PluginsService.setup` fails if any plugin instance does not have a setup function', async () => {
  mockPluginInitializers.set('pluginA', (() => ({})) as any);
  const pluginsService = new PluginsService(mockCoreContext);
  await expect(pluginsService.setup(mockDeps)).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Instance of plugin \\"pluginA\\" does not define \\"setup\\" function."`
  );
});

test('`PluginsService.setup` calls loadPluginBundles with basePath and plugins', async () => {
  const pluginsService = new PluginsService(mockCoreContext);
  await pluginsService.setup(mockDeps);

  expect(mockLoadPluginBundle).toHaveBeenCalledTimes(3);
  expect(mockLoadPluginBundle).toHaveBeenCalledWith(mockDeps.basePath.addToPath, 'pluginA');
  expect(mockLoadPluginBundle).toHaveBeenCalledWith(mockDeps.basePath.addToPath, 'pluginB');
  expect(mockLoadPluginBundle).toHaveBeenCalledWith(mockDeps.basePath.addToPath, 'pluginC');
});

test('`PluginsService.setup` initalizes plugins with CoreContext', async () => {
  const pluginsService = new PluginsService(mockCoreContext);
  await pluginsService.setup(mockDeps);

  expect(mockPluginInitializers.get('pluginA')).toHaveBeenCalledWith(mockCoreContext);
  expect(mockPluginInitializers.get('pluginB')).toHaveBeenCalledWith(mockCoreContext);
  expect(mockPluginInitializers.get('pluginC')).toHaveBeenCalledWith(mockCoreContext);
});

test('`PluginsService.setup` exposes dependent setup contracts to plugins', async () => {
  const pluginsService = new PluginsService(mockCoreContext);
  await pluginsService.setup(mockDeps);

  const pluginAInstance = mockPluginInitializers.get('pluginA')!.mock.results[0].value;
  const pluginBInstance = mockPluginInitializers.get('pluginB')!.mock.results[0].value;
  const pluginCInstance = mockPluginInitializers.get('pluginC')!.mock.results[0].value;

  expect(pluginAInstance.setup).toHaveBeenCalledWith(mockInitContext, {});
  expect(pluginBInstance.setup).toHaveBeenCalledWith(mockInitContext, {
    pluginA: { exportedValue: 1 },
  });
  // Does not supply value for `nonexist` optional dep
  expect(pluginCInstance.setup).toHaveBeenCalledWith(mockInitContext, {
    pluginA: { exportedValue: 1 },
  });
});

test('`PluginsService.setup` does not set missing dependent setup contracts', async () => {
  mockDeps.injectedMetadata.getPlugins.mockReturnValue([
    { id: 'pluginD', plugin: createManifest('pluginD', { required: ['missing'] }) },
  ]);
  mockPluginInitializers.set('pluginD', jest.fn(() => ({ setup: jest.fn() })) as any);

  const pluginsService = new PluginsService(mockCoreContext);
  await pluginsService.setup(mockDeps);

  // If a dependency is missing it should not be in the deps at all, not even as undefined.
  const pluginDInstance = mockPluginInitializers.get('pluginD')!.mock.results[0].value;
  expect(pluginDInstance.setup).toHaveBeenCalledWith(mockInitContext, {});
  const pluginDDeps = pluginDInstance.setup.mock.calls[0][1];
  expect(pluginDDeps).not.toHaveProperty('missing');
});

test('`PluginsService.setup` returns plugin setup contracts', async () => {
  const pluginsService = new PluginsService(mockCoreContext);
  const { contracts } = await pluginsService.setup(mockDeps);

  // Verify that plugin contracts were available
  expect((contracts.get('pluginA')! as any).exportedValue).toEqual(1);
  expect((contracts.get('pluginB')! as any).pluginAPlusB).toEqual(2);
});

test('`PluginService.stop` calls the stop function on each plugin', async () => {
  const pluginsService = new PluginsService(mockCoreContext);
  await pluginsService.setup(mockDeps);

  const pluginAInstance = mockPluginInitializers.get('pluginA')!.mock.results[0].value;
  const pluginBInstance = mockPluginInitializers.get('pluginB')!.mock.results[0].value;
  const pluginCInstance = mockPluginInitializers.get('pluginC')!.mock.results[0].value;

  await pluginsService.stop();

  expect(pluginAInstance.stop).toHaveBeenCalled();
  expect(pluginBInstance.stop).toHaveBeenCalled();
  expect(pluginCInstance.stop).toHaveBeenCalled();
});
