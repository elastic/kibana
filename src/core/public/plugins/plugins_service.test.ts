/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit, pick } from 'lodash';

import {
  MockedPluginInitializer,
  mockPluginInitializerProvider,
} from './plugins_service.test.mocks';

import { PluginName, PluginType } from 'src/core/server';
import { coreMock } from '../mocks';
import {
  PluginsService,
  PluginsServiceStartDeps,
  PluginsServiceSetupDeps,
} from './plugins_service';

import { InjectedPluginMetadata } from '../injected_metadata';
import { notificationServiceMock } from '../notifications/notifications_service.mock';
import { applicationServiceMock } from '../application/application_service.mock';
import { i18nServiceMock } from '../i18n/i18n_service.mock';
import { overlayServiceMock } from '../overlays/overlay_service.mock';
import { chromeServiceMock } from '../chrome/chrome_service.mock';
import { fatalErrorsServiceMock } from '../fatal_errors/fatal_errors_service.mock';
import { uiSettingsServiceMock } from '../ui_settings/ui_settings_service.mock';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { CoreSetup, CoreStart, PluginInitializerContext } from '..';
import { docLinksServiceMock } from '../doc_links/doc_links_service.mock';
import { savedObjectsServiceMock } from '../saved_objects/saved_objects_service.mock';
import { deprecationsServiceMock } from '../deprecations/deprecations_service.mock';

export let mockPluginInitializers: Map<PluginName, MockedPluginInitializer>;

mockPluginInitializerProvider.mockImplementation(
  (pluginName) => mockPluginInitializers.get(pluginName)!
);

let plugins: InjectedPluginMetadata[];

type DeeplyMocked<T> = { [P in keyof T]: jest.Mocked<T[P]> };

const mockCoreContext = coreMock.createCoreContext();
let mockSetupDeps: DeeplyMocked<PluginsServiceSetupDeps>;
let mockSetupContext: DeeplyMocked<CoreSetup>;
let mockStartDeps: DeeplyMocked<PluginsServiceStartDeps>;
let mockStartContext: DeeplyMocked<CoreStart>;

function createManifest(
  id: string,
  { required = [], optional = [] }: { required?: string[]; optional?: string[]; ui?: boolean } = {}
) {
  return {
    id,
    version: 'some-version',
    type: PluginType.standard,
    configPath: ['path'],
    requiredPlugins: required,
    optionalPlugins: optional,
    requiredBundles: [],
    owner: {
      name: 'Core',
      githubTeam: 'kibana-core',
    },
  };
}

describe('PluginsService', () => {
  beforeEach(() => {
    plugins = [
      { id: 'pluginA', plugin: createManifest('pluginA') },
      { id: 'pluginB', plugin: createManifest('pluginB', { required: ['pluginA'] }) },
      {
        id: 'pluginC',
        plugin: createManifest('pluginC', { required: ['pluginA'], optional: ['nonexist'] }),
      },
    ];
    mockSetupDeps = {
      application: applicationServiceMock.createInternalSetupContract(),
      fatalErrors: fatalErrorsServiceMock.createSetupContract(),
      http: httpServiceMock.createSetupContract(),
      injectedMetadata: injectedMetadataServiceMock.createStartContract(),
      notifications: notificationServiceMock.createSetupContract(),
      uiSettings: uiSettingsServiceMock.createSetupContract(),
    };
    mockSetupContext = {
      ...mockSetupDeps,
      application: expect.any(Object),
      getStartServices: expect.any(Function),
      injectedMetadata: pick(mockSetupDeps.injectedMetadata, 'getInjectedVar'),
    };
    mockStartDeps = {
      application: applicationServiceMock.createInternalStartContract(),
      docLinks: docLinksServiceMock.createStartContract(),
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
    };
    mockStartContext = {
      ...mockStartDeps,
      application: expect.any(Object),
      chrome: omit(mockStartDeps.chrome, 'getComponent'),
      injectedMetadata: pick(mockStartDeps.injectedMetadata, 'getInjectedVar'),
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

    it('returns plugin setup contracts', async () => {
      const pluginsService = new PluginsService(mockCoreContext, plugins);
      const { contracts } = await pluginsService.setup(mockSetupDeps);

      // Verify that plugin contracts were available
      expect((contracts.get('pluginA')! as any).setupValue).toEqual(1);
      expect((contracts.get('pluginB')! as any).pluginAPlusB).toEqual(2);
    });

    describe('timeout', () => {
      const flushPromises = () => new Promise((resolve) => setImmediate(resolve));
      beforeAll(() => {
        jest.useFakeTimers();
      });
      afterAll(() => {
        jest.useRealTimers();
      });

      it('throws timeout error if "setup" was not completed in 30 sec.', async () => {
        mockPluginInitializers.set(
          'pluginA',
          jest.fn(() => ({
            setup: jest.fn(() => new Promise((i) => i)),
            start: jest.fn(() => ({ value: 1 })),
            stop: jest.fn(),
          }))
        );
        const pluginsService = new PluginsService(mockCoreContext, plugins);
        const promise = pluginsService.setup(mockSetupDeps);

        await flushPromises();
        jest.runAllTimers(); // setup plugins

        await expect(promise).rejects.toMatchInlineSnapshot(
          `[Error: Setup lifecycle of "pluginA" plugin wasn't completed in 10sec. Consider disabling the plugin and re-start.]`
        );
      });
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

    it('returns plugin start contracts', async () => {
      const pluginsService = new PluginsService(mockCoreContext, plugins);
      await pluginsService.setup(mockSetupDeps);
      const { contracts } = await pluginsService.start(mockStartDeps);

      // Verify that plugin contracts were available
      expect((contracts.get('pluginA')! as any).startValue).toEqual(2);
      expect((contracts.get('pluginB')! as any).pluginAPlusB).toEqual(3);
    });
    describe('timeout', () => {
      beforeAll(() => {
        jest.useFakeTimers();
      });
      afterAll(() => {
        jest.useRealTimers();
      });

      it('throws timeout error if "start" was not completed in 30 sec.', async () => {
        mockPluginInitializers.set(
          'pluginA',
          jest.fn(() => ({
            setup: jest.fn(() => ({ value: 1 })),
            start: jest.fn(() => new Promise((i) => i)),
            stop: jest.fn(),
          }))
        );
        const pluginsService = new PluginsService(mockCoreContext, plugins);
        await pluginsService.setup(mockSetupDeps);

        const promise = pluginsService.start(mockStartDeps);
        jest.runAllTimers();

        await expect(promise).rejects.toMatchInlineSnapshot(
          `[Error: Start lifecycle of "pluginA" plugin wasn't completed in 10sec. Consider disabling the plugin and re-start.]`
        );
      });
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

  describe('asynchronous plugins', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    const runScenario = async ({
      production,
      asyncSetup,
      asyncStart,
    }: {
      production: boolean;
      asyncSetup: boolean;
      asyncStart: boolean;
    }) => {
      const coreContext = coreMock.createCoreContext({ production });

      const syncPlugin = { id: 'sync-plugin', plugin: createManifest('sync-plugin') };
      mockPluginInitializers.set(
        'sync-plugin',
        jest.fn(() => ({
          setup: jest.fn(() => 'setup-sync'),
          start: jest.fn(() => 'start-sync'),
          stop: jest.fn(),
        }))
      );

      const asyncPlugin = { id: 'async-plugin', plugin: createManifest('async-plugin') };
      mockPluginInitializers.set(
        'async-plugin',
        jest.fn(() => ({
          setup: jest.fn(() => (asyncSetup ? Promise.resolve('setup-async') : 'setup-sync')),
          start: jest.fn(() => (asyncStart ? Promise.resolve('start-async') : 'start-sync')),
          stop: jest.fn(),
        }))
      );

      const pluginsService = new PluginsService(coreContext, [syncPlugin, asyncPlugin]);

      await pluginsService.setup(mockSetupDeps);
      await pluginsService.start(mockStartDeps);
    };

    it('logs a warning if a plugin returns a promise from its setup contract in dev mode', async () => {
      await runScenario({
        production: false,
        asyncSetup: true,
        asyncStart: false,
      });

      expect(consoleSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "Plugin async-plugin is using asynchronous setup lifecycle. Asynchronous plugins support will be removed in a later version.",
          ],
        ]
      `);
    });

    it('does not log warnings if a plugin returns a promise from its setup contract in prod mode', async () => {
      await runScenario({
        production: true,
        asyncSetup: true,
        asyncStart: false,
      });

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('logs a warning if a plugin returns a promise from its start contract in dev mode', async () => {
      await runScenario({
        production: false,
        asyncSetup: false,
        asyncStart: true,
      });

      expect(consoleSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "Plugin async-plugin is using asynchronous start lifecycle. Asynchronous plugins support will be removed in a later version.",
          ],
        ]
      `);
    });

    it('does not log warnings if a plugin returns a promise from its start contract  in prod mode', async () => {
      await runScenario({
        production: true,
        asyncSetup: false,
        asyncStart: true,
      });

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('logs multiple warnings if both `setup` and `start` return promises', async () => {
      await runScenario({
        production: false,
        asyncSetup: true,
        asyncStart: true,
      });

      expect(consoleSpy.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "Plugin async-plugin is using asynchronous setup lifecycle. Asynchronous plugins support will be removed in a later version.",
          ],
          Array [
            "Plugin async-plugin is using asynchronous start lifecycle. Asynchronous plugins support will be removed in a later version.",
          ],
        ]
      `);
    });
  });
});
