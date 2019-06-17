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
import {
  PluginsService,
  PluginsServiceStartDeps,
  PluginsServiceSetupDeps,
} from './plugins_service';
import { notificationServiceMock } from '../notifications/notifications_service.mock';
import { applicationServiceMock } from '../application/application_service.mock';
import { i18nServiceMock } from '../i18n/i18n_service.mock';
import { overlayServiceMock } from '../overlays/overlay_service.mock';
import { chromeServiceMock } from '../chrome/chrome_service.mock';
import { fatalErrorsServiceMock } from '../fatal_errors/fatal_errors_service.mock';
import { uiSettingsServiceMock } from '../ui_settings/ui_settings_service.mock';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { UiSettingsClient } from '../ui_settings';
import { CoreSetup, CoreStart } from '..';

export let mockPluginInitializers: Map<PluginName, MockedPluginInitializer>;

mockPluginInitializerProvider.mockImplementation(
  pluginName => mockPluginInitializers.get(pluginName)!
);

type DeeplyMocked<T> = { [P in keyof T]: jest.Mocked<T[P]> };

const mockCoreContext: CoreContext = {};
let mockSetupDeps: DeeplyMocked<PluginsServiceSetupDeps>;
let mockSetupContext: DeeplyMocked<CoreSetup>;
let mockStartDeps: DeeplyMocked<PluginsServiceStartDeps>;
let mockStartContext: DeeplyMocked<CoreStart>;

beforeEach(() => {
  mockSetupDeps = {
    application: applicationServiceMock.createSetupContract(),
    injectedMetadata: (function() {
      const metadata = injectedMetadataServiceMock.createSetupContract();
      metadata.getPlugins.mockReturnValue([
        { id: 'pluginA', plugin: createManifest('pluginA') },
        { id: 'pluginB', plugin: createManifest('pluginB', { required: ['pluginA'] }) },
        {
          id: 'pluginC',
          plugin: createManifest('pluginC', { required: ['pluginA'], optional: ['nonexist'] }),
        },
      ]);
      return metadata;
    })(),
    fatalErrors: fatalErrorsServiceMock.createSetupContract(),
    http: httpServiceMock.createSetupContract(),
    notifications: notificationServiceMock.createSetupContract(),
    uiSettings: uiSettingsServiceMock.createSetupContract() as jest.Mocked<UiSettingsClient>,
  };
  mockSetupContext = omit(mockSetupDeps, 'application', 'injectedMetadata');
  mockStartDeps = {
    application: applicationServiceMock.createStartContract(),
    http: httpServiceMock.createStartContract(),
    chrome: chromeServiceMock.createStartContract(),
    i18n: i18nServiceMock.createStartContract(),
    injectedMetadata: injectedMetadataServiceMock.createStartContract(),
    notifications: notificationServiceMock.createStartContract(),
    overlays: overlayServiceMock.createStartContract(),
  };
  mockStartContext = {
    ...omit(mockStartDeps, 'injectedMetadata'),
    application: {
      capabilities: mockStartDeps.application.capabilities,
    },
  };

  // Reset these for each test.
  mockPluginInitializers = new Map<PluginName, MockedPluginInitializer>(([
    [
      'pluginA',
      jest.fn(() => ({
        setup: jest.fn(() => ({ setupValue: 1 })),
        start: jest.fn(() => ({ startValue: 2 })),
        stop: jest.fn(),
      })),
    ],
    [
      'pluginB',
      jest.fn(() => ({
        setup: jest.fn((core, deps: any) => ({
          pluginAPlusB: deps.pluginA.setupValue + 1,
        })),
        start: jest.fn((core, deps: any) => ({
          pluginAPlusB: deps.pluginA.startValue + 1,
        })),
        stop: jest.fn(),
      })),
    ],
    [
      'pluginC',
      jest.fn(() => ({
        setup: jest.fn(),
        start: jest.fn(),
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
  await expect(pluginsService.setup(mockSetupDeps)).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Could not load bundle"`
  );
});

test('`PluginsService.setup` fails if any plugin instance does not have a setup function', async () => {
  mockPluginInitializers.set('pluginA', (() => ({})) as any);
  const pluginsService = new PluginsService(mockCoreContext);
  await expect(pluginsService.setup(mockSetupDeps)).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Instance of plugin \\"pluginA\\" does not define \\"setup\\" function."`
  );
});

test('`PluginsService.setup` calls loadPluginBundles with http and plugins', async () => {
  const pluginsService = new PluginsService(mockCoreContext);
  await pluginsService.setup(mockSetupDeps);

  expect(mockLoadPluginBundle).toHaveBeenCalledTimes(3);
  expect(mockLoadPluginBundle).toHaveBeenCalledWith(mockSetupDeps.http.basePath.prepend, 'pluginA');
  expect(mockLoadPluginBundle).toHaveBeenCalledWith(mockSetupDeps.http.basePath.prepend, 'pluginB');
  expect(mockLoadPluginBundle).toHaveBeenCalledWith(mockSetupDeps.http.basePath.prepend, 'pluginC');
});

test('`PluginsService.setup` initalizes plugins with CoreContext', async () => {
  const pluginsService = new PluginsService(mockCoreContext);
  await pluginsService.setup(mockSetupDeps);

  expect(mockPluginInitializers.get('pluginA')).toHaveBeenCalledWith(mockCoreContext);
  expect(mockPluginInitializers.get('pluginB')).toHaveBeenCalledWith(mockCoreContext);
  expect(mockPluginInitializers.get('pluginC')).toHaveBeenCalledWith(mockCoreContext);
});

test('`PluginsService.setup` exposes dependent setup contracts to plugins', async () => {
  const pluginsService = new PluginsService(mockCoreContext);
  await pluginsService.setup(mockSetupDeps);

  const pluginAInstance = mockPluginInitializers.get('pluginA')!.mock.results[0].value;
  const pluginBInstance = mockPluginInitializers.get('pluginB')!.mock.results[0].value;
  const pluginCInstance = mockPluginInitializers.get('pluginC')!.mock.results[0].value;

  expect(pluginAInstance.setup).toHaveBeenCalledWith(mockSetupContext, {});
  expect(pluginBInstance.setup).toHaveBeenCalledWith(mockSetupContext, {
    pluginA: { setupValue: 1 },
  });
  // Does not supply value for `nonexist` optional dep
  expect(pluginCInstance.setup).toHaveBeenCalledWith(mockSetupContext, {
    pluginA: { setupValue: 1 },
  });
});

test('`PluginsService.setup` does not set missing dependent setup contracts', async () => {
  mockSetupDeps.injectedMetadata.getPlugins.mockReturnValue([
    { id: 'pluginD', plugin: createManifest('pluginD', { required: ['missing'] }) },
  ]);
  mockPluginInitializers.set('pluginD', jest.fn(() => ({
    setup: jest.fn(),
    start: jest.fn(),
  })) as any);

  const pluginsService = new PluginsService(mockCoreContext);
  await pluginsService.setup(mockSetupDeps);

  // If a dependency is missing it should not be in the deps at all, not even as undefined.
  const pluginDInstance = mockPluginInitializers.get('pluginD')!.mock.results[0].value;
  expect(pluginDInstance.setup).toHaveBeenCalledWith(mockSetupContext, {});
  const pluginDDeps = pluginDInstance.setup.mock.calls[0][1];
  expect(pluginDDeps).not.toHaveProperty('missing');
});

test('`PluginsService.setup` returns plugin setup contracts', async () => {
  const pluginsService = new PluginsService(mockCoreContext);
  const { contracts } = await pluginsService.setup(mockSetupDeps);

  // Verify that plugin contracts were available
  expect((contracts.get('pluginA')! as any).setupValue).toEqual(1);
  expect((contracts.get('pluginB')! as any).pluginAPlusB).toEqual(2);
});

test('`PluginsService.start` exposes dependent start contracts to plugins', async () => {
  const pluginsService = new PluginsService(mockCoreContext);
  await pluginsService.setup(mockSetupDeps);
  await pluginsService.start(mockStartDeps);

  const pluginAInstance = mockPluginInitializers.get('pluginA')!.mock.results[0].value;
  const pluginBInstance = mockPluginInitializers.get('pluginB')!.mock.results[0].value;
  const pluginCInstance = mockPluginInitializers.get('pluginC')!.mock.results[0].value;

  expect(pluginAInstance.start).toHaveBeenCalledWith(mockStartContext, {});
  expect(pluginBInstance.start).toHaveBeenCalledWith(mockStartContext, {
    pluginA: { startValue: 2 },
  });
  // Does not supply value for `nonexist` optional dep
  expect(pluginCInstance.start).toHaveBeenCalledWith(mockStartContext, {
    pluginA: { startValue: 2 },
  });
});

test('`PluginsService.start` does not set missing dependent start contracts', async () => {
  mockSetupDeps.injectedMetadata.getPlugins.mockReturnValue([
    { id: 'pluginD', plugin: createManifest('pluginD', { required: ['missing'] }) },
  ]);
  mockPluginInitializers.set('pluginD', jest.fn(() => ({
    setup: jest.fn(),
    start: jest.fn(),
  })) as any);

  const pluginsService = new PluginsService(mockCoreContext);
  await pluginsService.setup(mockSetupDeps);
  await pluginsService.start(mockStartDeps);

  // If a dependency is missing it should not be in the deps at all, not even as undefined.
  const pluginDInstance = mockPluginInitializers.get('pluginD')!.mock.results[0].value;
  expect(pluginDInstance.start).toHaveBeenCalledWith(mockStartContext, {});
  const pluginDDeps = pluginDInstance.start.mock.calls[0][1];
  expect(pluginDDeps).not.toHaveProperty('missing');
});

test('`PluginsService.start` returns plugin start contracts', async () => {
  const pluginsService = new PluginsService(mockCoreContext);
  await pluginsService.setup(mockSetupDeps);
  const { contracts } = await pluginsService.start(mockStartDeps);

  // Verify that plugin contracts were available
  expect((contracts.get('pluginA')! as any).startValue).toEqual(2);
  expect((contracts.get('pluginB')! as any).pluginAPlusB).toEqual(3);
});

test('`PluginService.stop` calls the stop function on each plugin', async () => {
  const pluginsService = new PluginsService(mockCoreContext);
  await pluginsService.setup(mockSetupDeps);

  const pluginAInstance = mockPluginInitializers.get('pluginA')!.mock.results[0].value;
  const pluginBInstance = mockPluginInitializers.get('pluginB')!.mock.results[0].value;
  const pluginCInstance = mockPluginInitializers.get('pluginC')!.mock.results[0].value;

  await pluginsService.stop();

  expect(pluginAInstance.stop).toHaveBeenCalled();
  expect(pluginBInstance.stop).toHaveBeenCalled();
  expect(pluginCInstance.stop).toHaveBeenCalled();
});
