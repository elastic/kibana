/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-server-mocks';
import type { UserProfileWithSecurity, UserProfileData } from '@kbn/core-user-profile-common';
import { UserSettingsService } from './user_settings_service';

describe('#setup', () => {
  let coreContext: ReturnType<typeof mockCoreContext.create>;
  let service: UserSettingsService;
  let startDeps: { userProfile: ReturnType<typeof userProfileServiceMock.createInternalStart> };

  beforeEach(() => {
    coreContext = mockCoreContext.create();
    service = new UserSettingsService(coreContext);
    startDeps = {
      userProfile: userProfileServiceMock.createInternalStart(),
    };
  });

  const createUserProfile = (
    userSettings: Partial<NonNullable<UserProfileData['userSettings']>>
  ): UserProfileWithSecurity => {
    return {
      data: {
        userSettings,
      },
    } as unknown as UserProfileWithSecurity;
  };

  it('fetches userSettings when client is set and returns `true` when `darkMode` is set to `dark`', async () => {
    startDeps.userProfile.getCurrent.mockResolvedValue(createUserProfile({ darkMode: 'dark' }));

    const { getUserSettingDarkMode } = service.setup();
    service.start(startDeps);

    const kibanaRequest = httpServerMock.createKibanaRequest();
    const darkMode = await getUserSettingDarkMode(kibanaRequest);

    expect(darkMode).toEqual(true);
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledTimes(1);
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledWith({
      request: kibanaRequest,
      dataPath: 'userSettings',
    });
  });

  it('fetches userSettings when client is set and returns `false` when `darkMode` is set to `light`', async () => {
    startDeps.userProfile.getCurrent.mockResolvedValue(createUserProfile({ darkMode: 'light' }));

    const { getUserSettingDarkMode } = service.setup();
    service.start(startDeps);

    const kibanaRequest = httpServerMock.createKibanaRequest();
    const darkMode = await getUserSettingDarkMode(kibanaRequest);

    expect(darkMode).toEqual(false);
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledTimes(1);
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledWith({
      request: kibanaRequest,
      dataPath: 'userSettings',
    });
  });

  it('fetches userSettings when client is set and returns `system` when `darkMode` is set to `system`', async () => {
    startDeps.userProfile.getCurrent.mockResolvedValue(createUserProfile({ darkMode: 'system' }));

    const { getUserSettingDarkMode } = service.setup();
    service.start(startDeps);

    const kibanaRequest = httpServerMock.createKibanaRequest();
    const darkMode = await getUserSettingDarkMode(kibanaRequest);

    expect(darkMode).toEqual('system');
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledTimes(1);
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledWith({
      request: kibanaRequest,
      dataPath: 'userSettings',
    });
  });

  it('fetches userSettings when client is set and returns `undefined` when `darkMode` is set to `` (the default value)', async () => {
    startDeps.userProfile.getCurrent.mockResolvedValue(createUserProfile({ darkMode: undefined }));

    const { getUserSettingDarkMode } = service.setup();
    service.start(startDeps);

    const kibanaRequest = httpServerMock.createKibanaRequest();
    const darkMode = await getUserSettingDarkMode(kibanaRequest);

    expect(darkMode).toEqual(undefined);
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledTimes(1);
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledWith({
      request: kibanaRequest,
      dataPath: 'userSettings',
    });
  });

  it('fetches userSettings when client is set and returns `undefined` when `darkMode` is set to `space_default`', async () => {
    startDeps.userProfile.getCurrent.mockResolvedValue(
      createUserProfile({ darkMode: 'space_default' })
    );

    const { getUserSettingDarkMode } = service.setup();
    service.start(startDeps);

    const kibanaRequest = httpServerMock.createKibanaRequest();
    const darkMode = await getUserSettingDarkMode(kibanaRequest);

    expect(darkMode).toEqual(undefined);
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledTimes(1);
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledWith({
      request: kibanaRequest,
      dataPath: 'userSettings',
    });
  });

  it('fetches userSettings when client is set and returns `true` when `rememberSelectedSpace` is set to `true`', async () => {
    startDeps.userProfile.getCurrent.mockResolvedValue(
      createUserProfile({ rememberSelectedSpace: true })
    );

    const { getUserSettingRememberSelectedSpace } = service.setup();
    service.start(startDeps);

    const kibanaRequest = httpServerMock.createKibanaRequest();
    const rememberSelectedSpace = await getUserSettingRememberSelectedSpace(kibanaRequest);

    expect(rememberSelectedSpace).toEqual(true);
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledTimes(1);
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledWith({
      request: kibanaRequest,
      dataPath: 'userSettings',
    });
  });

  it('fetches userSettings when client is set and returns `false` when `rememberSelectedSpace` is set to `false`', async () => {
    startDeps.userProfile.getCurrent.mockResolvedValue(
      createUserProfile({ rememberSelectedSpace: false })
    );

    const { getUserSettingRememberSelectedSpace } = service.setup();
    service.start(startDeps);

    const kibanaRequest = httpServerMock.createKibanaRequest();
    const rememberSelectedSpace = await getUserSettingRememberSelectedSpace(kibanaRequest);

    expect(rememberSelectedSpace).toEqual(false);
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledTimes(1);
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledWith({
      request: kibanaRequest,
      dataPath: 'userSettings',
    });
  });

  it('fetches userSettings when client is set and returns `true` when `rememberSelectedSpace` is not set', async () => {
    startDeps.userProfile.getCurrent.mockResolvedValue(
      createUserProfile({ rememberSelectedSpace: undefined })
    );

    const { getUserSettingRememberSelectedSpace } = service.setup();
    service.start(startDeps);

    const kibanaRequest = httpServerMock.createKibanaRequest();
    const rememberSelectedSpace = await getUserSettingRememberSelectedSpace(kibanaRequest);

    expect(rememberSelectedSpace).toEqual(true);
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledTimes(1);
    expect(startDeps.userProfile.getCurrent).toHaveBeenCalledWith({
      request: kibanaRequest,
      dataPath: 'userSettings',
    });
  });

  it('does not fetch userSettings when client is not set, returns `undefined`, and logs a debug statement', async () => {
    const { getUserSettingDarkMode } = service.setup();

    const kibanaRequest = httpServerMock.createKibanaRequest();
    const darkMode = await getUserSettingDarkMode(kibanaRequest);

    expect(darkMode).toEqual(undefined);
    expect(coreContext.logger.get().debug).toHaveBeenCalledWith('userProfile not set');
  });
});
