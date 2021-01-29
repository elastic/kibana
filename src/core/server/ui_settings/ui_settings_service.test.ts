/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { schema } from '@kbn/config-schema';

import {
  MockUiSettingsClientConstructor,
  getCoreSettingsMock,
} from './ui_settings_service.test.mock';
import { UiSettingsService, SetupDeps } from './ui_settings_service';
import { httpServiceMock } from '../http/http_service.mock';
import { savedObjectsClientMock } from '../mocks';
import { savedObjectsServiceMock } from '../saved_objects/saved_objects_service.mock';
import { mockCoreContext } from '../core_context.mock';
import { uiSettingsType } from './saved_objects';

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
    getCoreSettingsMock.mockClear();
  });

  describe('#setup', () => {
    it('registers the uiSettings type to the savedObjects registry', async () => {
      await service.setup(setupDeps);
      expect(setupDeps.savedObjects.registerType).toHaveBeenCalledTimes(1);
      expect(setupDeps.savedObjects.registerType).toHaveBeenCalledWith(uiSettingsType);
    });

    it('calls `getCoreSettings`', async () => {
      await service.setup(setupDeps);
      expect(getCoreSettingsMock).toHaveBeenCalledTimes(1);
    });

    describe('#register', () => {
      it('throws if registers the same key twice', async () => {
        const setup = await service.setup(setupDeps);
        setup.register(defaults);
        expect(() => setup.register(defaults)).toThrowErrorMatchingInlineSnapshot(
          `"uiSettings for the key [foo] has been already registered"`
        );
      });
    });
  });

  describe('#start', () => {
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
  });
});
