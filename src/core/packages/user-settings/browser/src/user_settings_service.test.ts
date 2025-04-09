/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UserProfileService } from '@kbn/core-user-profile-browser';
import { UserSettingsService } from './user_settings_service';
import { UserSettingsMeta } from './types';

const mockedUserProfile = {
  getCurrent: jest.fn(),
  partialUpdate: jest.fn(() => Promise.resolve()),
};

const normalUserSetting: UserSettingsMeta = {
  name: 'setting1',
  isSpaceAware: false,
  defaultValue: 'default_setting1',
  requiredPageReload: false,
};

const spaceAwareUserSetting: UserSettingsMeta = {
  name: 'setting2',
  isSpaceAware: true,
  defaultValue: 'default_setting2',
  requiredPageReload: false,
};

describe('UserSettingsService', () => {
  let userSettingsService: UserSettingsService;
  const spaceId = 'spaceId';
  const appId = 'appId';

  beforeEach(() => {
    userSettingsService = new UserSettingsService(
      mockedUserProfile as unknown as UserProfileService,
      spaceId,
      appId
    );

    mockedUserProfile.getCurrent.mockReturnValue({
      data: {
        userSettings: {},
      },
    });

    mockedUserProfile.partialUpdate.mockReturnValue(Promise.resolve());

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create an instance of UserSettingsService', () => {
    expect(userSettingsService).toBeInstanceOf(UserSettingsService);
  });

  describe('register Setting', () => {
    it('should register a setting correctly', async () => {
      await userSettingsService.registerSettings([normalUserSetting, spaceAwareUserSetting]);
      expect(userSettingsService.isRegistered(normalUserSetting.name)).toBe(true);
      expect(userSettingsService.isRegistered(spaceAwareUserSetting.name)).toBe(true);
    });

    it('should call get latest user settings on registeration', async () => {
      await userSettingsService.registerSettings([normalUserSetting, spaceAwareUserSetting]);
      expect(mockedUserProfile.getCurrent).toHaveBeenCalledWith({
        dataPath: `userSettings.${appId}`,
      });
    });

    describe('Errors', () => {
      it('should throw an error if trying to register the same key twice', async () => {
        await userSettingsService.registerSettings([normalUserSetting, spaceAwareUserSetting]);

        await userSettingsService.registerSettings([normalUserSetting]).catch((e) => {
          expect(e.message).toBe(`Setting ${normalUserSetting.name} is already registered`);
        });
      });
    });
  });

  describe('get', () => {
    it('should return the default value if the setting is not set', async () => {
      await userSettingsService.registerSettings([normalUserSetting]);
      const key = normalUserSetting.name;
      expect(userSettingsService.get(key)).toBe(normalUserSetting.defaultValue);
    });

    it('should return the value if the setting is set for non-space aware setting', async () => {
      const key = normalUserSetting.name;
      const value = 'custom_value';
      mockedUserProfile.getCurrent.mockReturnValue({
        data: {
          userSettings: {
            [appId]: JSON.stringify([[key, value]]),
          },
        },
      });
      await userSettingsService.registerSettings([normalUserSetting]);
      expect(userSettingsService.get(key)).toBe(value);
    });

    it('should return value if the setting is set for space aware setting', async () => {
      const key = `${spaceAwareUserSetting.name}`;
      const value = 'custom_value';
      mockedUserProfile.getCurrent.mockReturnValue({
        data: {
          userSettings: {
            [appId]: JSON.stringify([[`${key}:${spaceId}`, value]]),
          },
        },
      });
      await userSettingsService.registerSettings([spaceAwareUserSetting]);
      expect(userSettingsService.get(key)).toBe(value);
    });

    describe('Errors', () => {
      it('should throw an error if trying to get a setting that is not registered', async () => {
        await userSettingsService.registerSettings([normalUserSetting, spaceAwareUserSetting]);
        const key = 'unknown_setting';
        expect(() => userSettingsService.get(key)).toThrow(`Setting ${key} is not registered.`);
      });
    });
  });

  describe('get$', () => {
    it('should get the updated value when user subscribes to the getter', async () => {
      const key = normalUserSetting.name;
      const value = 'custom_value';
      const value2 = 'custom_value2';
      const value3 = 'custom_value3';
      mockedUserProfile.getCurrent.mockReturnValue({
        data: {
          userSettings: {
            [appId]: JSON.stringify([[key, value]]),
          },
        },
      });
      await userSettingsService.registerSettings([normalUserSetting]);

      const mockFn = jest.fn();
      const valueObserver = userSettingsService.get$(key).subscribe((newValue) => mockFn(newValue));

      expect(mockFn).toHaveBeenNthCalledWith(1, value);

      userSettingsService.set(key, value2);
      expect(mockFn).toHaveBeenNthCalledWith(2, value2);

      userSettingsService.set(key, value3);
      expect(mockFn).toHaveBeenNthCalledWith(3, value3);

      valueObserver.unsubscribe();
    });

    describe('Errors', () => {
      it('should throw an error if trying to get a setting that is not registered', async () => {
        await userSettingsService.registerSettings([normalUserSetting, spaceAwareUserSetting]);
        const key = 'unknown_setting';
        expect(() => userSettingsService.get$(key)).toThrow(`Setting ${key} is not registered.`);
      });
    });
  });

  describe('set', () => {
    it('should set the value synchroously for a setting and fire update request later', async () => {
      const key = normalUserSetting.name;
      const value = 'custom_value';
      mockedUserProfile.getCurrent.mockReturnValue({
        data: {
          userSettings: {
            [appId]: JSON.stringify([]),
          },
        },
      });
      await userSettingsService.registerSettings([normalUserSetting]);
      userSettingsService.set(key, value);
      expect(mockedUserProfile.partialUpdate).not.toHaveBeenCalled();
      expect(userSettingsService.get(key)).toBe(value);
      jest.advanceTimersByTime(1500);
      expect(mockedUserProfile.partialUpdate).toHaveBeenCalledWith({
        userSettings: {
          [appId]: JSON.stringify([[key, value]]),
        },
      });
    });

    it('should debounce the update request if set is called multiple times', async () => {
      const key = normalUserSetting.name;
      const value1 = 'custom_value1';
      const value2 = 'custom_value2';
      const value3 = 'custom_value3';
      mockedUserProfile.getCurrent.mockReturnValue({
        data: {
          userSettings: {
            [appId]: JSON.stringify([]),
          },
        },
      });
      await userSettingsService.registerSettings([normalUserSetting]);
      userSettingsService.set(key, value1);
      userSettingsService.set(key, value2);
      userSettingsService.set(key, value3);
      expect(mockedUserProfile.partialUpdate).not.toHaveBeenCalled();
      expect(userSettingsService.get(key)).toBe(value3);
      jest.advanceTimersByTime(1500);
      expect(mockedUserProfile.partialUpdate).toHaveBeenNthCalledWith(1, {
        userSettings: {
          [appId]: JSON.stringify([[key, value3]]),
        },
      });
    });

    describe('Errors', () => {
      it('should throw an error if trying to set a value for an unregistered setting', async () => {
        await userSettingsService.registerSettings([normalUserSetting]);
        const key = 'unknown_setting';
        expect(() => userSettingsService.set(key, 'value')).toThrow(
          `Setting ${key} is not registered.`
        );
      });
    });
  });

  describe('update$', () => {
    it('should return the updated value when user subscribes to the update$', async () => {
      const key = normalUserSetting.name;
      const value = 'custom_value';
      const value2 = 'custom_value2';
      const value3 = 'custom_value3';
      mockedUserProfile.getCurrent.mockReturnValue({
        data: {
          userSettings: {
            [appId]: JSON.stringify([[key, value]]),
          },
        },
      });
      await userSettingsService.registerSettings([normalUserSetting]);

      const mockFn = jest.fn();
      const updatesObserver = userSettingsService
        .getUpdate$()
        .subscribe((newValue) => mockFn(newValue));

      userSettingsService.set(key, value2);
      expect(mockFn).toHaveBeenNthCalledWith(1, {
        key,
        newValue: value2,
        oldValue: value,
      });

      userSettingsService.set(key, value3);
      expect(mockFn).toHaveBeenNthCalledWith(2, {
        key,
        newValue: value3,
        oldValue: value2,
      });

      updatesObserver.unsubscribe();
    });

    it('should not public the update if the value is the same as the old value', async () => {
      const key = normalUserSetting.name;
      const value = 'custom_value';
      mockedUserProfile.getCurrent.mockReturnValue({
        data: {
          userSettings: {
            [appId]: JSON.stringify([[key, value]]),
          },
        },
      });
      await userSettingsService.registerSettings([normalUserSetting]);

      const mockFn = jest.fn();
      const updatesObserver = userSettingsService
        .getUpdate$()
        .subscribe((newValue) => mockFn(newValue));

      userSettingsService.set(key, value);
      jest.runAllTimers();

      expect(mockedUserProfile.partialUpdate).not.toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalledTimes(0);

      updatesObserver.unsubscribe();
    });
  });

  describe('updateError$', () => {
    const key = normalUserSetting.name;
    const value = 'custom_value';
    const customValue = 'custom_value2';
    const errorMessage = 'error_message';
    beforeEach(async () => {
      mockedUserProfile.getCurrent.mockReturnValue({
        data: {
          userSettings: {
            [appId]: JSON.stringify([[key, value]]),
          },
        },
      });
      await userSettingsService.registerSettings([normalUserSetting]);
    });
    it('should return the error when user subscribes to the updateError$', (done) => {
      mockedUserProfile.partialUpdate.mockRejectedValue(new Error(errorMessage));
      userSettingsService.getUpdateErrors$().subscribe((err) => {
        expect(key in err).toBe(true);
        expect(err[key].message).toBe(errorMessage);
        done();
      });

      userSettingsService.set(key, customValue);
      jest.runAllTimers();
    });

    it('should revert the changes in cache if there is an error while updating user profile', (done) => {
      mockedUserProfile.partialUpdate.mockRejectedValue(new Error(errorMessage));
      const mockFn = jest.fn();
      userSettingsService.getUpdate$().subscribe(mockFn);
      userSettingsService.getUpdateErrors$().subscribe((err) => {
        expect(key in err).toBe(true);
        expect(err[key].message).toBe(errorMessage);

        expect(userSettingsService.get(key)).toBe(value);
        expect(mockFn).toHaveBeenCalledTimes(2);
        expect(mockFn).toHaveBeenNthCalledWith(1, {
          key,
          newValue: customValue,
          oldValue: value,
        });

        expect(mockFn).toHaveBeenNthCalledWith(2, {
          key,
          newValue: value,
          oldValue: customValue,
        });

        done();
      });

      userSettingsService.set(key, customValue);
      expect(mockedUserProfile.partialUpdate).not.toHaveBeenCalled();
      expect(userSettingsService.get(key)).toBe(customValue);

      jest.runAllTimers();
      expect(mockedUserProfile.partialUpdate).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove the non-space aware setting and call the update request', async () => {
      const key = normalUserSetting.name;
      const customValue = 'custom_value';
      mockedUserProfile.getCurrent.mockReturnValue({
        data: {
          userSettings: {
            [appId]: JSON.stringify([[key, customValue]]),
          },
        },
      });
      await userSettingsService.registerSettings([normalUserSetting]);
      // should return the custom value stored in user profile
      expect(userSettingsService.get(key)).toBe(customValue);

      await userSettingsService.remove(key);

      // should return the default value after removing
      expect(userSettingsService.get(key)).toBe(normalUserSetting.defaultValue);

      expect(mockedUserProfile.partialUpdate).toHaveBeenCalledWith({
        userSettings: {
          [appId]: JSON.stringify([]),
        },
      });
    });

    it('should remove the space aware setting and call the update request', async () => {
      const key = `${spaceAwareUserSetting.name}`;
      const customValue = 'custom_value';
      mockedUserProfile.getCurrent.mockReturnValue({
        data: {
          userSettings: {
            [appId]: JSON.stringify([[`${key}:${spaceId}`, customValue]]),
          },
        },
      });
      await userSettingsService.registerSettings([spaceAwareUserSetting]);
      // should return the custom value stored in user profile
      expect(userSettingsService.get(key)).toBe(customValue);

      await userSettingsService.remove(key);

      // should return the default value after removing
      expect(userSettingsService.get(key)).toBe(spaceAwareUserSetting.defaultValue);

      expect(mockedUserProfile.partialUpdate).toHaveBeenCalledWith({
        userSettings: {
          [appId]: JSON.stringify([]),
        },
      });
    });

    describe('Errors', () => {
      it('should throw an error if trying to remove an unregistered setting', async () => {
        await userSettingsService.registerSettings([normalUserSetting]);
        const key = 'unknown_setting';
        await userSettingsService.remove(key).catch((e) => {
          expect(e.message).toBe(`Setting ${key} is not registered.`);
        });
      });
    });
  });
});
