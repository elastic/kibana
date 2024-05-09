/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';

import {
  type MockedPluginInitializer,
  mockPluginInitializerProvider,
  runtimeResolverMock,
} from './plugins_service.test.mocks';

import { type PluginName, type DiscoveredPlugin, PluginType } from '@kbn/core-base-common';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { coreContextMock } from '@kbn/core-base-browser-mocks';

import {
  PluginsService,
  type PluginsServiceStartDeps,
  type PluginsServiceSetupDeps,
} from './plugins_service';

import type { InjectedMetadataPlugin } from '@kbn/core-injected-metadata-common-internal';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { fatalErrorsServiceMock } from '@kbn/core-fatal-errors-browser-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { PluginInitializerContext } from '@kbn/core-plugins-browser';
import type { CoreSetup, CoreStart } from '@kbn/core-lifecycle-browser';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-browser-mocks';
import { deprecationsServiceMock } from '@kbn/core-deprecations-browser-mocks';
import { securityServiceMock } from '@kbn/core-security-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';

export let mockPluginInitializers: Map<PluginName, MockedPluginInitializer>;

mockPluginInitializerProvider.mockImplementation(
  (pluginName) => mockPluginInitializers.get(pluginName)!
);

let plugins: InjectedMetadataPlugin[];

type DeeplyMocked<T> = { [P in keyof T]: jest.Mocked<T[P]> };

const mockCoreContext = coreContextMock.create();
let mockSetupDeps: DeeplyMocked<PluginsServiceSetupDeps>;
let mockSetupContext: DeeplyMocked<CoreSetup>;
let mockStartDeps: DeeplyMocked<PluginsServiceStartDeps>;
let mockStartContext: DeeplyMocked<CoreStart>;

function createManifest(
  id: string,
  { required = [], optional = [] }: { required?: string[]; optional?: string[]; ui?: boolean } = {}
): DiscoveredPlugin {
  return {
    id,
    type: PluginType.standard,
    configPath: ['path'],
    requiredPlugins: required,
    optionalPlugins: optional,
    requiredBundles: [],
    runtimePluginDependencies: [],
  };
}

describe('PluginsService', () => {
  beforeEach(() => {
    runtimeResolverMock.setDependencyMap.mockReset();
    runtimeResolverMock.resolveSetupRequests.mockReset();
    runtimeResolverMock.resolveStartRequests.mockReset();

    plugins = [
      { id: 'pluginA', plugin: createManifest('pluginA') },
      { id: 'pluginB', plugin: createManifest('pluginB', { required: ['pluginA'] }) },
      {
        id: 'pluginC',
        plugin: createManifest('pluginC', { required: ['pluginA'], optional: ['nonexist'] }),
      },
    ];
    // @ts-expect-error this file was not being type checked properly in the past, error is legit
    mockSetupDeps = {
      analytics: analyticsServiceMock.createAnalyticsServiceSetup(),
      application: applicationServiceMock.createInternalSetupContract(),
      fatalErrors: fatalErrorsServiceMock.createSetupContract(),
      executionContext: executionContextServiceMock.createSetupContract(),
      http: httpServiceMock.createSetupContract(),
      injectedMetadata: injectedMetadataServiceMock.createStartContract(),
      notifications: notificationServiceMock.createSetupContract(),
      uiSettings: uiSettingsServiceMock.createSetupContract(),
      theme: themeServiceMock.createSetupContract(),
      security: securityServiceMock.createInternalSetup(),
      userProfile: userProfileServiceMock.createInternalSetup(),
    };
    mockSetupContext = {
      ...omit(mockSetupDeps, 'injectedMetadata'),
      application: expect.any(Object),
      plugins: expect.any(Object),
      getStartServices: expect.any(Function),
      security: expect.any(Object),
      userProfile: expect.any(Object),
      http: {
        ...mockSetupDeps.http,
        staticAssets: expect.any(Object),
      },
    };
    // @ts-expect-error this file was not being type checked properly in the past, error is legit
    mockStartDeps = {
      analytics: analyticsServiceMock.createAnalyticsServiceStart(),
      application: applicationServiceMock.createInternalStartContract(),
      docLinks: docLinksServiceMock.createStartContract(),
      executionContext: executionContextServiceMock.createStartContract(),
      http: httpServiceMock.createStartContract(),
      chrome: chromeServiceMock.createStartContract(),
      i18n: i18nServiceMock.createStartContract(),
      injectedMetadata: injectedMetadataServiceMock.createStartContract(),
      notifications: notificationServiceMock.createStartContract(),
      overlays: overlayServiceMock.createStartContract(),
      uiSettings: uiSettingsServiceMock.createStartContract(),
      savedObjects: savedObjectsServiceMock.createStartContract(),
      fatalErrors: fatalErrorsServiceMock.createStartContract(),
      deprecations: deprecationsServiceMock.createStartContract(),
      theme: themeServiceMock.createStartContract(),
      security: securityServiceMock.createInternalStart(),
      userProfile: userProfileServiceMock.createInternalStart(),
    };
    mockStartContext = {
      ...omit(mockStartDeps, 'injectedMetadata'),
      application: expect.any(Object),
      plugins: expect.any(Object),
      chrome: omit(mockStartDeps.chrome, 'getComponent'),
      security: expect.any(Object),
      userProfile: expect.any(Object),
      http: {
        ...mockStartDeps.http,
        staticAssets: expect.any(Object),
      },
    };

    // Reset these for each test.
    mockPluginInitializers = new Map<PluginName, MockedPluginInitializer>([
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
    ] as unknown as [[PluginName, any]]);
  });

  describe('#getOpaqueIds()', () => {
    it('returns dependency tree of symbols', () => {
      const pluginsService = new PluginsService(mockCoreContext, plugins);
      expect(pluginsService.getOpaqueIds()).toMatchInlineSnapshot(`
            Map {
              Symbol(pluginA) => Array [],
              Symbol(pluginB) => Array [
                Symbol(pluginA),
              ],
              Symbol(pluginC) => Array [
                Symbol(pluginA),
              ],
            }
        `);
    });
  });

  describe('#setup()', () => {
    it('fails if any plugin instance does not have a setup function', async () => {
      mockPluginInitializers.set('pluginA', (() => ({})) as any);
      const pluginsService = new PluginsService(mockCoreContext, plugins);
      await expect(pluginsService.setup(mockSetupDeps)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Instance of plugin \\"pluginA\\" does not define \\"setup\\" function."`
      );
    });

    it('initializes plugins with PluginInitializerContext', async () => {
      const pluginsService = new PluginsService(mockCoreContext, plugins);
      await pluginsService.setup(mockSetupDeps);

      expect(mockPluginInitializers.get('pluginA')).toHaveBeenCalledWith(expect.any(Object));
      expect(mockPluginInitializers.get('pluginB')).toHaveBeenCalledWith(expect.any(Object));
      expect(mockPluginInitializers.get('pluginC')).toHaveBeenCalledWith(expect.any(Object));
    });

    it('initializes plugins with associated client configuration', async () => {
      const pluginConfig = {
        clientProperty: 'some value',
      };
      plugins[0].config = pluginConfig;

      const pluginsService = new PluginsService(mockCoreContext, plugins);
      await pluginsService.setup(mockSetupDeps);

      const initializerContext = mockPluginInitializers.get('pluginA')!.mock
        .calls[0][0] as PluginInitializerContext;
      const config = initializerContext.config.get();
      expect(config).toMatchObject(pluginConfig);
    });

    it('exposes dependent setup contracts to plugins', async () => {
      const pluginsService = new PluginsService(mockCoreContext, plugins);
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

    it('does not set missing dependent setup contracts', async () => {
      plugins = [{ id: 'pluginD', plugin: createManifest('pluginD', { optional: ['missing'] }) }];
      mockPluginInitializers.set(
        'pluginD',
        jest.fn(() => ({
          setup: jest.fn(),
          start: jest.fn(),
        })) as any
      );

      const pluginsService = new PluginsService(mockCoreContext, plugins);
      await pluginsService.setup(mockSetupDeps);

      // If a dependency is missing it should not be in the deps at all, not even as undefined.
      const pluginDInstance = mockPluginInitializers.get('pluginD')!.mock.results[0].value;
      expect(pluginDInstance.setup).toHaveBeenCalledWith(mockSetupContext, {});
      const pluginDDeps = pluginDInstance.setup.mock.calls[0][1];
      expect(pluginDDeps).not.toHaveProperty('missing');
    });

    it('setups the runtimeResolver', async () => {
      const pluginsService = new PluginsService(mockCoreContext, plugins);
      await pluginsService.setup(mockSetupDeps);

      expect(runtimeResolverMock.setDependencyMap).toHaveBeenCalledTimes(1);
      expect(runtimeResolverMock.setDependencyMap).toHaveBeenCalledWith(expect.any(Map));

      expect(runtimeResolverMock.resolveSetupRequests).toHaveBeenCalledTimes(1);
      expect(runtimeResolverMock.resolveSetupRequests).toHaveBeenCalledWith(expect.any(Map));
      expect(
        Object.fromEntries([...runtimeResolverMock.resolveSetupRequests.mock.calls[0][0].entries()])
      ).toEqual({
        pluginA: {
          setupValue: 1,
        },
        pluginB: {
          pluginAPlusB: 2,
        },
        pluginC: undefined,
      });
    });

    it('returns plugin setup contracts', async () => {
      const pluginsService = new PluginsService(mockCoreContext, plugins);
      const { contracts } = await pluginsService.setup(mockSetupDeps);

      // Verify that plugin contracts were available
      expect((contracts.get('pluginA')! as any).setupValue).toEqual(1);
      expect((contracts.get('pluginB')! as any).pluginAPlusB).toEqual(2);
    });
  });

  describe('#start()', () => {
    it('exposes dependent start contracts to plugins', async () => {
      const pluginsService = new PluginsService(mockCoreContext, plugins);
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

    it('does not set missing dependent start contracts', async () => {
      plugins = [{ id: 'pluginD', plugin: createManifest('pluginD', { optional: ['missing'] }) }];
      mockPluginInitializers.set(
        'pluginD',
        jest.fn(() => ({
          setup: jest.fn(),
          start: jest.fn(),
        })) as any
      );

      const pluginsService = new PluginsService(mockCoreContext, plugins);
      await pluginsService.setup(mockSetupDeps);
      await pluginsService.start(mockStartDeps);

      // If a dependency is missing it should not be in the deps at all, not even as undefined.
      const pluginDInstance = mockPluginInitializers.get('pluginD')!.mock.results[0].value;
      expect(pluginDInstance.start).toHaveBeenCalledWith(mockStartContext, {});
      const pluginDDeps = pluginDInstance.start.mock.calls[0][1];
      expect(pluginDDeps).not.toHaveProperty('missing');
    });

    it('setups the runtimeResolver', async () => {
      const pluginsService = new PluginsService(mockCoreContext, plugins);
      await pluginsService.setup(mockSetupDeps);
      await pluginsService.start(mockStartDeps);

      expect(runtimeResolverMock.resolveStartRequests).toHaveBeenCalledTimes(1);
      expect(runtimeResolverMock.resolveStartRequests).toHaveBeenCalledWith(expect.any(Map));
      expect(
        Object.fromEntries([...runtimeResolverMock.resolveStartRequests.mock.calls[0][0].entries()])
      ).toEqual({
        pluginA: {
          startValue: 2,
        },
        pluginB: {
          pluginAPlusB: 3,
        },
        pluginC: undefined,
      });
    });

    it('returns plugin start contracts', async () => {
      const pluginsService = new PluginsService(mockCoreContext, plugins);
      await pluginsService.setup(mockSetupDeps);
      const { contracts } = await pluginsService.start(mockStartDeps);

      // Verify that plugin contracts were available
      expect((contracts.get('pluginA')! as any).startValue).toEqual(2);
      expect((contracts.get('pluginB')! as any).pluginAPlusB).toEqual(3);
    });
  });

  describe('#stop()', () => {
    it('calls the stop function on each plugin', async () => {
      const pluginsService = new PluginsService(mockCoreContext, plugins);
      await pluginsService.setup(mockSetupDeps);

      const pluginAInstance = mockPluginInitializers.get('pluginA')!.mock.results[0].value;
      const pluginBInstance = mockPluginInitializers.get('pluginB')!.mock.results[0].value;
      const pluginCInstance = mockPluginInitializers.get('pluginC')!.mock.results[0].value;

      await pluginsService.stop();

      expect(pluginAInstance.stop).toHaveBeenCalled();
      expect(pluginBInstance.stop).toHaveBeenCalled();
      expect(pluginCInstance.stop).toHaveBeenCalled();
    });
  });
});
