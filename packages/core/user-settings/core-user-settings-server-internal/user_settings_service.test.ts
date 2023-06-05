/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { UserSettingsService } from './user_settings_service';
import { httpServerMock } from '@kbn/core-http-server-mocks';

describe('#setup', () => {
  const coreContext: ReturnType<typeof mockCoreContext.create> = mockCoreContext.create();
  const { createKibanaRequest } = httpServerMock;

  it('fetches userSettings when client is set and returns `true` when `darkMode` is set to `dark`', async () => {
    const service = new UserSettingsService(coreContext);
    const { setUserProfileSettings, getUserSettingDarkMode } = service.setup();

    const userProfileContract = {
      get: jest.fn().mockReturnValueOnce(Promise.resolve({ darkMode: 'dark' })),
    };

    setUserProfileSettings(userProfileContract);

    const kibanaRequest = createKibanaRequest();
    const darkMode = await getUserSettingDarkMode(kibanaRequest);

    expect(darkMode).toEqual(true);
    expect(userProfileContract.get).toHaveBeenCalledTimes(1);
    expect(userProfileContract.get).toHaveBeenCalledWith(kibanaRequest);
  });

  it('fetches userSettings when client is set and returns `false` when `darkMode` is set to `light`', async () => {
    const service = new UserSettingsService(coreContext);
    const { setUserProfileSettings, getUserSettingDarkMode } = service.setup();

    const userProfileContract = {
      get: jest.fn().mockReturnValueOnce(Promise.resolve({ darkMode: 'light' })),
    };

    setUserProfileSettings(userProfileContract);

    const kibanaRequest = createKibanaRequest();
    const darkMode = await getUserSettingDarkMode(kibanaRequest);

    expect(darkMode).toEqual(false);
    expect(userProfileContract.get).toHaveBeenCalledTimes(1);
    expect(userProfileContract.get).toHaveBeenCalledWith(kibanaRequest);
  });

  it('fetches userSettings when client is set and returns `undefined` when `darkMode` is set to `` (the default value)', async () => {
    const service = new UserSettingsService(coreContext);
    const { setUserProfileSettings, getUserSettingDarkMode } = service.setup();

    const userProfileContract = {
      get: jest.fn().mockReturnValueOnce(Promise.resolve({ darkMode: '' })),
    };

    setUserProfileSettings(userProfileContract);

    const kibanaRequest = createKibanaRequest();
    const darkMode = await getUserSettingDarkMode(kibanaRequest);

    expect(darkMode).toEqual(undefined);
    expect(userProfileContract.get).toHaveBeenCalledTimes(1);
    expect(userProfileContract.get).toHaveBeenCalledWith(kibanaRequest);
  });

  it('does not fetch userSettings when client is not set, returns `undefined`, and logs a debug statement', async () => {
    const service = new UserSettingsService(coreContext);
    const { getUserSettingDarkMode } = service.setup();
    const kibanaRequest = createKibanaRequest();
    const darkMode = await getUserSettingDarkMode(kibanaRequest);

    expect(darkMode).toEqual(undefined);
    expect(coreContext.logger.get().debug).toHaveBeenCalledWith(
      'UserProfileSettingsClient not set'
    );
  });
});
