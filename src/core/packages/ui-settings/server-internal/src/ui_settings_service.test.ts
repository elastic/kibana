/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { schema } from '@kbn/config-schema';

import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import {
  MockUiSettingsClientConstructor,
  MockUiSettingsGlobalClientConstructor,
  MockUiSettingsDefaultsClientConstructor,
  getCoreSettingsMock,
  getCoreGlobalSettingsMock,
} from './ui_settings_service.test.mock';
import type { SetupDeps } from './ui_settings_service';
import { UiSettingsService } from './ui_settings_service';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { uiSettingsType, uiSettingsGlobalType } from './saved_objects';
import { UiSettingsDefaultsClient } from './clients/ui_settings_defaults_client';

const overrides = {
  overrideBaz: 'baz',
};

const globalOverrides = {
  globalOverrideBaz: 'baz',
};

const defaults = {
  foo: {
    name: 'foo',
    value: 'bar',
    category: [],
    description: '',
    schema: schema.string(),
  },
};

describe('uiSettings', () => {
  let service: UiSettingsService;
  let setupDeps: SetupDeps;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    const coreContext = mockCoreContext.create();
    coreContext.configService.atPath.mockReturnValue(
      new BehaviorSubject({ overrides, globalOverrides })
    );
    const httpSetup = httpServiceMock.createInternalSetupContract();
    const savedObjectsSetup = savedObjectsServiceMock.createInternalSetupContract();
    setupDeps = { http: httpSetup, savedObjects: savedObjectsSetup };
    savedObjectsClient = savedObjectsClientMock.create();
    service = new UiSettingsService(coreContext);
  });

  afterEach(() => {
    MockUiSettingsClientConstructor.mockClear();
    MockUiSettingsGlobalClientConstructor.mockClear();
    getCoreSettingsMock.mockClear();
    getCoreGlobalSettingsMock.mockClear();
  });

  describe('#preboot', () => {
    it('calls `getCoreSettings`', async () => {
      await service.preboot();
      expect(getCoreSettingsMock).toHaveBeenCalledTimes(1);
    });

    it('#createDefaultsClient', async () => {
      const { createDefaultsClient } = await service.preboot();

      const client = createDefaultsClient();
      expect(client).toBeInstanceOf(UiSettingsDefaultsClient);

      expect(MockUiSettingsDefaultsClientConstructor).toHaveBeenCalledTimes(1);
      const [[constructorArgs]] = MockUiSettingsDefaultsClientConstructor.mock.calls;
      expect(constructorArgs).toMatchObject({ overrides, defaults: {} });
      expect(constructorArgs.overrides).toBe(overrides);
    });
  });

  describe('#setup', () => {
    beforeEach(async () => {
      await service.preboot();
    });

    it('registers the uiSettings type to the savedObjects registry', async () => {
      await service.setup(setupDeps);
      expect(setupDeps.savedObjects.registerType).toHaveBeenCalledTimes(2);
      expect(setupDeps.savedObjects.registerType).toHaveBeenCalledWith(uiSettingsType);
      expect(setupDeps.savedObjects.registerType).toHaveBeenCalledWith(uiSettingsGlobalType);
    });

    describe('#register', () => {
      it('throws if registers the same key twice', async () => {
        const setup = await service.setup(setupDeps);
        setup.register(defaults);
        expect(() => setup.register(defaults)).toThrowErrorMatchingInlineSnapshot(
          `"uiSettings for the key [foo] has been already registered"`
        );
      });

      it('throws if registers the same key twice to global settings', async () => {
        const setup = await service.setup(setupDeps);
        setup.registerGlobal(defaults);
        expect(() => setup.registerGlobal(defaults)).toThrowErrorMatchingInlineSnapshot(
          `"Global uiSettings for the key [foo] has been already registered"`
        );
      });

      it('does not throw when registering a global and namespaced setting with the same name', async () => {
        const setup = await service.setup(setupDeps);
        setup.register(defaults);
        expect(() => setup.registerGlobal(defaults)).not.toThrow();
      });
    });

    describe('#setAllowlist', () => {
      // Skipped because we disabled this multi-call check temporarily
      it.skip('throws if setAllowlist is called twice', async () => {
        const { setAllowlist } = await service.setup(setupDeps);
        setAllowlist(['mySetting']);

        expect(() => setAllowlist(['newSetting'])).toThrowErrorMatchingInlineSnapshot(
          `"The uiSettings allowlist has already been set up. Instead of calling setAllowlist(), add your settings to packages/serverless/settings"`
        );
      });
    });
  });

  describe('#start', () => {
    beforeEach(async () => {
      await service.preboot();
    });

    describe('validation', () => {
      it('throws if validation schema is not provided', async () => {
        const { register } = await service.setup(setupDeps);
        register({
          // @ts-expect-error schema is required key
          custom: {
            value: 42,
          },
        });

        await expect(service.start()).rejects.toMatchInlineSnapshot(
          `[Error: Validation schema is not provided for [custom] UI Setting]`
        );
      });

      it('throws if validation schema is not provided for global settings', async () => {
        const { registerGlobal } = await service.setup(setupDeps);
        registerGlobal({
          // @ts-expect-error schema is required key
          custom: {
            value: 42,
          },
        });

        await expect(service.start()).rejects.toMatchInlineSnapshot(
          `[Error: Validation schema is not provided for [custom] Global UI Setting]`
        );
      });

      it('validates registered definitions', async () => {
        const { register } = await service.setup(setupDeps);
        register({
          custom: {
            value: 42,
            schema: schema.string(),
          },
        });

        await expect(service.start()).rejects.toMatchInlineSnapshot(
          `[Error: [ui settings defaults [custom]]: expected value of type [string] but got [number]]`
        );
      });

      it('validates registered definitions for global settings', async () => {
        const { registerGlobal } = await service.setup(setupDeps);
        registerGlobal({
          custom: {
            value: 42,
            schema: schema.string(),
          },
        });

        await expect(service.start()).rejects.toMatchInlineSnapshot(
          `[Error: expected value of type [string] but got [number]]`
        );
      });

      it('validates overrides', async () => {
        const coreContext = mockCoreContext.create();
        coreContext.configService.atPath.mockReturnValueOnce(
          new BehaviorSubject({
            overrides: {
              custom: 42,
            },
            globalOverrides: {},
          })
        );
        const customizedService = new UiSettingsService(coreContext);
        const { register } = await customizedService.setup(setupDeps);
        register({
          custom: {
            value: '42',
            schema: schema.string(),
          },
        });

        await expect(customizedService.start()).rejects.toMatchInlineSnapshot(
          `[Error: [ui settings overrides [custom]]: expected value of type [string] but got [number]]`
        );
      });

      it('validates global overrides', async () => {
        const coreContext = mockCoreContext.create();
        coreContext.configService.atPath.mockReturnValueOnce(
          new BehaviorSubject({
            overrides: {},
            globalOverrides: {
              custom: 24,
            },
          })
        );
        const customizedService = new UiSettingsService(coreContext);
        const { registerGlobal } = await customizedService.setup(setupDeps);
        registerGlobal({
          custom: {
            value: '24',
            schema: schema.string(),
          },
        });

        await expect(customizedService.start()).rejects.toMatchInlineSnapshot(
          `[Error: [global ui settings overrides [custom]]: expected value of type [string] but got [number]]`
        );
      });

      it('does not throw on unknown overrides', async () => {
        const coreContext = mockCoreContext.create();
        coreContext.configService.atPath.mockReturnValueOnce(
          new BehaviorSubject({
            overrides: {
              custom: 42,
            },
            globalOverrides: {},
          })
        );
        const customizedService = new UiSettingsService(coreContext);
        await customizedService.setup(setupDeps);

        await customizedService.start();
      });

      it('does not throw on unknown global overrides', async () => {
        const coreContext = mockCoreContext.create();
        coreContext.configService.atPath.mockReturnValueOnce(
          new BehaviorSubject({
            overrides: {},
            globalOverrides: {
              custom: 24,
            },
          })
        );
        const customizedService = new UiSettingsService(coreContext);
        await customizedService.setup(setupDeps);

        await customizedService.start();
      });

      it('throws when the allowlist contains unregistered settings', async () => {
        const { setAllowlist } = await service.setup(setupDeps);
        setAllowlist(['mySetting']);

        await expect(service.start()).rejects.toMatchInlineSnapshot(
          `[Error: The uiSetting with key [mySetting] is in the allowlist but is not registered. Make sure to remove it from the allowlist in /packages/serverless/settings]`
        );
      });
    });

    describe('#applyAllowlist', () => {
      const settingId = 'mySetting';
      const testSetting = {
        name: 'My setting',
        value: 10,
        readonly: true,
        schema: schema.number(),
      };

      it('allowlisted readonly settings have "ui" readonly mode', async () => {
        const { register, setAllowlist } = await service.setup(setupDeps);
        register({ [settingId]: testSetting });
        setAllowlist([settingId]);

        const expectedSetting = {
          ...testSetting,
          readonlyMode: 'ui',
        };

        const start = await service.start();
        start.asScopedToClient(savedObjectsClient);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].defaults).toEqual({
          [settingId]: expectedSetting,
        });
      });

      it('non-allowlisted settings have "strict" readonly mode', async () => {
        const { register, setAllowlist } = await service.setup(setupDeps);
        register({ [settingId]: testSetting });
        setAllowlist([]);

        const expectedSetting = {
          ...testSetting,
          readonlyMode: 'strict',
        };

        const start = await service.start();
        start.asScopedToClient(savedObjectsClient);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].defaults).toEqual({
          [settingId]: expectedSetting,
        });
      });
    });

    describe('#asScopedToClient', () => {
      it('passes saved object type "config" to UiSettingsClient', async () => {
        await service.setup(setupDeps);
        const start = await service.start();
        start.asScopedToClient(savedObjectsClient);

        expect(MockUiSettingsClientConstructor).toHaveBeenCalledTimes(1);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].type).toBe('config');
      });

      it('passes overrides to UiSettingsClient', async () => {
        await service.setup(setupDeps);
        const start = await service.start();
        start.asScopedToClient(savedObjectsClient);
        expect(MockUiSettingsClientConstructor).toHaveBeenCalledTimes(1);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].overrides).toBe(overrides);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].overrides).toEqual(overrides);
      });

      it('passes a copy of set defaults to UiSettingsClient', async () => {
        const setup = await service.setup(setupDeps);
        setup.register(defaults);
        const start = await service.start();
        start.asScopedToClient(savedObjectsClient);

        expect(MockUiSettingsClientConstructor).toHaveBeenCalledTimes(1);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].defaults).toEqual(defaults);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].defaults).not.toBe(defaults);
      });
    });

    describe('#asScopedToGlobalClient', () => {
      it('passes saved object type "config-global" to UiSettingsGlobalClient', async () => {
        await service.setup(setupDeps);
        const start = await service.start();
        start.globalAsScopedToClient(savedObjectsClient);

        expect(MockUiSettingsGlobalClientConstructor).toHaveBeenCalledTimes(1);
        expect(MockUiSettingsGlobalClientConstructor.mock.calls[0][0].type).toBe('config-global');
      });

      it('passes overrides to UiSettingsGlobalClient', async () => {
        await service.setup(setupDeps);
        const start = await service.start();
        start.globalAsScopedToClient(savedObjectsClient);

        expect(MockUiSettingsGlobalClientConstructor).toHaveBeenCalledTimes(1);
        expect(MockUiSettingsGlobalClientConstructor.mock.calls[0][0].overrides).toEqual(
          globalOverrides
        );
      });

      it('passes a copy of set global defaults to UiSettingsGlobalClient', async () => {
        const setup = await service.setup(setupDeps);
        setup.registerGlobal(defaults);
        const start = await service.start();
        start.globalAsScopedToClient(savedObjectsClient);

        expect(MockUiSettingsGlobalClientConstructor).toHaveBeenCalledTimes(1);
        expect(MockUiSettingsGlobalClientConstructor.mock.calls[0][0].defaults).toEqual(defaults);
        expect(MockUiSettingsGlobalClientConstructor.mock.calls[0][0].defaults).not.toBe(defaults);
      });
    });

    describe('get$', () => {
      beforeEach(() => {
        jest.useFakeTimers();
        const { UiSettingsClient } = jest.requireActual<
          typeof import('./clients/ui_settings_client')
        >('./clients/ui_settings_client');
        MockUiSettingsClientConstructor.mockImplementation(
          (options: ConstructorParameters<typeof UiSettingsClient>[0]) =>
            new UiSettingsClient(options)
        );
      });

      afterEach(() => {
        jest.useRealTimers();
        MockUiSettingsClientConstructor.mockReset();
      });

      const startWithWatchedSetting = async () => {
        const { register } = await service.setup(setupDeps);
        register({
          watched: {
            value: 'from-default',
            schema: schema.string(),
          },
        });
        savedObjectsClient.getCurrentNamespace.mockReturnValue('space-1');
        savedObjectsClient.get.mockResolvedValue({
          type: 'config',
          id: 'version',
          references: [],
          attributes: { watched: 'from-es' },
        });
        const start = await service.start();
        return start;
      };

      it('shares one read per tick between two clients for the same space', async () => {
        const start = await startWithWatchedSetting();
        const firstClient = start.asScopedToClient(savedObjectsClient);
        const secondClient = start.asScopedToClient(savedObjectsClient);
        const firstValues: string[] = [];
        const secondValues: string[] = [];
        const firstSubscription = firstClient.get$<string>('watched').subscribe((value) => {
          firstValues.push(value);
        });
        const secondSubscription = secondClient.get$<string>('watched').subscribe((value) => {
          secondValues.push(value);
        });

        await jest.advanceTimersByTimeAsync(0);
        expect(firstValues).toEqual(['from-es']);
        expect(secondValues).toEqual(['from-es']);
        const readsAfterSubscribe = savedObjectsClient.get.mock.calls.length;

        await jest.advanceTimersByTimeAsync(10_000);
        expect(savedObjectsClient.get.mock.calls.length).toBe(readsAfterSubscribe + 1);
        await jest.advanceTimersByTimeAsync(10_000);
        expect(savedObjectsClient.get.mock.calls.length).toBe(readsAfterSubscribe + 2);

        firstSubscription.unsubscribe();
        secondSubscription.unsubscribe();
      });

      it('completes an open get$ on stop, and a get$ started after stop completes without another poll', async () => {
        const start = await startWithWatchedSetting();
        const client = start.asScopedToClient(savedObjectsClient);
        const values: string[] = [];
        let completed = false;
        client.get$<string>('watched').subscribe({
          next: (value) => values.push(value),
          complete: () => {
            completed = true;
          },
        });

        await jest.advanceTimersByTimeAsync(0);
        expect(values).toEqual(['from-es']);
        expect(completed).toBe(false);

        await service.stop();
        await jest.advanceTimersByTimeAsync(0);
        expect(completed).toBe(true);

        const laterValues: string[] = [];
        let laterCompleted = false;
        start
          .asScopedToClient(savedObjectsClient)
          .get$<string>('watched')
          .subscribe({
            next: (value) => laterValues.push(value),
            complete: () => {
              laterCompleted = true;
            },
          });
        await jest.advanceTimersByTimeAsync(0);
        expect(laterCompleted).toBe(true);
        expect(laterValues).toEqual(['from-es']);

        const readsAfterStop = savedObjectsClient.get.mock.calls.length;
        await jest.advanceTimersByTimeAsync(30_000);
        expect(savedObjectsClient.get.mock.calls.length).toBe(readsAfterStop);
        expect(laterValues).toEqual(['from-es']);
      });
    });
  });
});
