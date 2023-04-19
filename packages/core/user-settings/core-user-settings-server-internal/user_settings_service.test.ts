/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { UserSettingsService } from './user_settings_service';
import { KibanaRequest } from '@kbn/core-http-server';

describe('#setup', () => {
  const coreContext: ReturnType<typeof mockCoreContext.create> = mockCoreContext.create();

  it('fetches userSettings when client is set and returns proper values', async () => {
    const service = new UserSettingsService(coreContext);
    const { setUserProfileSettings, getUserSettingDarkMode } = service.setup();

    setUserProfileSettings({
      get: jest.fn().mockReturnValueOnce(Promise.resolve({ darkMode: 'dark' })),
    });

    const darkMode = await getUserSettingDarkMode({} as KibanaRequest);
    expect(darkMode).toEqual('dark');
  });

  it('does not fetch userSettings when client is not set, returns an empty string, and logs a debug statement', async () => {
    const service = new UserSettingsService(coreContext);
    const { getUserSettingDarkMode } = service.setup();

    const darkMode = await getUserSettingDarkMode({} as KibanaRequest);
    expect(darkMode).toEqual('');
    expect(coreContext.logger.get().debug).toHaveBeenCalledWith(
      'UserProfileSettingsClient not set'
    );
  });
});
