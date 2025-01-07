/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { UiSettingsGlobalClient } from './ui_settings_global_client';

const logger = loggingSystemMock.create().get();

const TYPE = 'config-global';
const ID = 'kibana-version';
const BUILD_NUM = 1234;

interface SetupOptions {
  defaults?: Record<string, any>;
  esDocSource?: Record<string, any>;
  overrides?: Record<string, any>;
}

describe('ui settings global client', () => {
  const settingA: UiSettingsParams = {
    name: 'settingA',
    value: 'abc',
    scope: 'global',
    schema: schema.string(),
  };
  const settingB: UiSettingsParams = {
    name: 'settingB',
    value: 123,
    scope: 'global',
    schema: schema.number(),
  };
  const settingC: UiSettingsParams = {
    name: 'settingC',
    value: false,
    scope: 'global',
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
    savedObjectsClient.get.mockReturnValue({ attributes: esDocSource } as any);

    const uiSettingsClient = new UiSettingsGlobalClient({
      type: TYPE,
      id: ID,
      buildNum: BUILD_NUM,
      defaults,
      savedObjectsClient,
      overrides,
      log: logger,
    });

    return {
      uiSettingsClient,
      savedObjectsClient,
    };
  }

  afterEach(() => jest.clearAllMocks());

  describe('#set()', () => {
    it('throws an error if setting is not registered', async () => {
      const { uiSettingsClient } = setup();
      const setUnregisteredSetting = async () => {
        await uiSettingsClient.set('settingD', 'cde');
      };
      expect(setUnregisteredSetting).rejects.toThrow(
        'Global setting settingD is not registered. Global settings need to be registered before they can be set'
      );
    });

    it('sets a value of a registered setting', async () => {
      const { uiSettingsClient, savedObjectsClient } = setup();
      await uiSettingsClient.set('settingA', 'cde');
      expect(savedObjectsClient.update).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        TYPE,
        ID,
        {
          settingA: 'cde',
        },
        { refresh: false }
      );
    });
  });

  describe('#set many()', () => {
    it('throws an error if any of the settings are not registered', async () => {
      const { uiSettingsClient, savedObjectsClient } = setup();
      const setSettings = async () => {
        await uiSettingsClient.setMany({ settingZ: 'cde', settingC: true });
      };
      expect(setSettings).rejects.toThrow(
        'Global setting settingZ is not registered. Global settings need to be registered before they can be set'
      );
      expect(savedObjectsClient.update).not.toHaveBeenCalled();
    });

    it('does not throws if validateKeys option is set to "false"', async () => {
      const { uiSettingsClient, savedObjectsClient } = setup();
      const setSettings = async () => {
        await uiSettingsClient.setMany(
          { settingZ: 'cde', settingC: true },
          { validateKeys: false }
        );
        return 'done';
      };
      expect(setSettings()).resolves.toBe('done');
      expect(savedObjectsClient.update).toHaveBeenCalled();
    });
  });

  describe('#remove many()', () => {
    it('throws an error if any of the settings are not registered', async () => {
      const { uiSettingsClient, savedObjectsClient } = setup();
      const setSettings = async () => {
        await uiSettingsClient.removeMany(['foo']);
      };
      expect(setSettings).rejects.toThrow(
        'Global setting foo is not registered. Global settings need to be registered before they can be set'
      );
      expect(savedObjectsClient.update).not.toHaveBeenCalled();
    });

    it('does not throws if validateKeys option is set to "false"', async () => {
      const { uiSettingsClient, savedObjectsClient } = setup();
      const setSettings = async () => {
        await uiSettingsClient.removeMany(['foo'], { validateKeys: false });
        return 'done';
      };
      expect(setSettings()).resolves.toBe('done');
      expect(savedObjectsClient.update).toHaveBeenCalled();
    });
  });
});
