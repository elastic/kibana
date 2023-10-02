/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
} from './ui_settings_service.test.mock';
import { UiSettingsService, SetupDeps } from './ui_settings_service';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { uiSettingsType, uiSettingsGlobalType } from './saved_objects';
import { UiSettingsDefaultsClient } from './clients/ui_settings_defaults_client';

const overrides = {
  overrideBaz: 'baz',
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
    coreContext.configService.atPath.mockReturnValue(new BehaviorSubject({ overrides }));
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

      expect(MockUiSettingsDefaultsClientConstructor).toBeCalledTimes(1);
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

      it('do not throw on unknown overrides', async () => {
        const coreContext = mockCoreContext.create();
        coreContext.configService.atPath.mockReturnValueOnce(
          new BehaviorSubject({
            overrides: {
              custom: 42,
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

        expect(MockUiSettingsClientConstructor).toBeCalledTimes(1);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].type).toBe('config');
      });

      it('passes overrides to UiSettingsClient', async () => {
        await service.setup(setupDeps);
        const start = await service.start();
        start.asScopedToClient(savedObjectsClient);
        expect(MockUiSettingsClientConstructor).toBeCalledTimes(1);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].overrides).toBe(overrides);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].overrides).toEqual(overrides);
      });

      it('passes a copy of set defaults to UiSettingsClient', async () => {
        const setup = await service.setup(setupDeps);
        setup.register(defaults);
        const start = await service.start();
        start.asScopedToClient(savedObjectsClient);

        expect(MockUiSettingsClientConstructor).toBeCalledTimes(1);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].defaults).toEqual(defaults);
        expect(MockUiSettingsClientConstructor.mock.calls[0][0].defaults).not.toBe(defaults);
      });
    });

    describe('#asScopedToGlobalClient', () => {
      it('passes saved object type "config-global" to UiSettingsGlobalClient', async () => {
        await service.setup(setupDeps);
        const start = await service.start();
        start.globalAsScopedToClient(savedObjectsClient);

        expect(MockUiSettingsGlobalClientConstructor).toBeCalledTimes(1);
        expect(MockUiSettingsGlobalClientConstructor.mock.calls[0][0].type).toBe('config-global');
      });

      it('passes overrides to UiSettingsGlobalClient', async () => {
        await service.setup(setupDeps);
        const start = await service.start();
        start.globalAsScopedToClient(savedObjectsClient);

        expect(MockUiSettingsGlobalClientConstructor).toBeCalledTimes(1);
        expect(MockUiSettingsGlobalClientConstructor.mock.calls[0][0].overrides).toEqual({});
      });

      it('passes a copy of set defaults to UiSettingsGlobalClient', async () => {
        const setup = await service.setup(setupDeps);
        setup.register(defaults);
        const start = await service.start();
        start.globalAsScopedToClient(savedObjectsClient);

        expect(MockUiSettingsGlobalClientConstructor).toBeCalledTimes(1);
        expect(MockUiSettingsGlobalClientConstructor.mock.calls[0][0].defaults).toEqual({});
      });
    });
  });
});
