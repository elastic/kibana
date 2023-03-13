/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { UiSettingsUserClient } from './ui_settings_user_client';
import { UserProfileSettingsClientContract } from '@kbn/core-ui-settings-server/src/contracts';
import { KibanaRequest } from '@kbn/core-http-server';

const logger = loggingSystemMock.create().get();

const TYPE = 'config-global';
const ID = 'kibana-version';
const BUILD_NUM = 1234;

interface SetupOptions {
  defaults?: Record<string, any>;
  esDocSource?: Record<string, any>;
  overrides?: Record<string, any>;
}

describe('ui settings user client', () => {
  const settingA: UiSettingsParams = {
    name: 'settingA',
    value: 'abc',
    scope: 'user',
    schema: schema.string(),
  };
  const settingB: UiSettingsParams = {
    name: 'settingB',
    value: 123,
    scope: 'user',
    schema: schema.number(),
  };
  const settingC: UiSettingsParams = {
    name: 'settingC',
    value: false,
    scope: 'user',
    schema: schema.boolean(),
  };
  const defaults = {
    settingA,
    settingB,
    settingC,
  };
  function setup(options: SetupOptions = {}) {
    const { overrides = {}, esDocSource = {} } = options;
    const savedObjectsClient = savedObjectsClientMock.create();
    const userProfileSettingsClient = {
      get: jest.fn(),
    } as unknown as jest.Mocked<UserProfileSettingsClientContract>;

    savedObjectsClient.get.mockReturnValue({ attributes: esDocSource } as any);

    userProfileSettingsClient.get.mockReturnValue(Promise.resolve({ darkMode: 'dark' }));

    const uiSettingsClient = new UiSettingsUserClient({
      type: TYPE,
      id: ID,
      buildNum: BUILD_NUM,
      defaults,
      savedObjectsClient,
      userProfileSettingsClient,
      overrides,
      log: logger,
    });

    return {
      uiSettingsClient,
      savedObjectsClient,
      userProfileSettingsClient,
    };
  }

  afterEach(() => jest.clearAllMocks());

  describe('#set()', () => {
    it('logs a warning since User Settings are not currently stored in SO', async () => {
      const { uiSettingsClient } = setup();
      await uiSettingsClient.set('settingD', 'cde');

      expect(logger.warn).toHaveBeenCalledWith(
        '`set` operation is not supported for User Settings.'
      );
    });
  });

  describe('#set many()', () => {
    it('logs a warning since User Settings are not currently stored in SO', async () => {
      const { uiSettingsClient } = setup();
      await uiSettingsClient.setMany({ settingZ: 'cde', settingC: true });

      expect(logger.warn).toHaveBeenCalledWith(
        '`setMany` operation is not supported for User Settings.'
      );
    });
  });

  describe('#remove()', () => {
    it('logs a warning since User Settings are not currently stored in SO', async () => {
      const { uiSettingsClient } = setup();
      await uiSettingsClient.remove('settingZ');

      expect(logger.warn).toHaveBeenCalledWith(
        '`remove` operation is not supported for User Settings.'
      );
    });
  });

  describe('#removeMany()', () => {
    it('logs a warning since User Settings are not currently stored in SO', async () => {
      const { uiSettingsClient } = setup();
      await uiSettingsClient.removeMany(['settingZ, settingC']);

      expect(logger.warn).toHaveBeenCalledWith(
        '`removeMany` operation is not supported for User Settings.'
      );
    });
  });

  describe('#getUserProvided()', () => {
    it('logs a warning since User Settings are not currently stored in SO', async () => {
      const { uiSettingsClient } = setup();
      const userProvided = await uiSettingsClient.getUserProvided();

      expect(logger.warn).toHaveBeenCalledWith(
        '`getUserProvided` operation is not supported for User Settings.'
      );
      expect(userProvided).toEqual({});
    });
  });

  describe('#getUserProfileSettings()', () => {
    it('should retrieve User Settings', async () => {
      const { uiSettingsClient } = setup();
      const request = {} as KibanaRequest;
      const userSettings = await uiSettingsClient.getUserProfileSettings(request);

      expect(userSettings.darkMode).toEqual('dark');
    });
  });
});
