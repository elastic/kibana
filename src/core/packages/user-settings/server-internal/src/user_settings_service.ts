/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext } from '@kbn/core-base-server-internal';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { DarkModeValue } from '@kbn/core-ui-settings-common';
import type { InternalUserProfileServiceStart } from '@kbn/core-user-profile-server-internal';
import type { UserProfileData } from '@kbn/core-user-profile-common';

export interface UserSettingsServiceStartDeps {
  userProfile: InternalUserProfileServiceStart;
}

const userSettingsDataPath = 'userSettings';

/**
 * @internal
 */
export interface UserSettings {
  darkMode: DarkModeValue | undefined;
  locale: string | undefined;
  rememberSelectedSpace: boolean;
}

/**
 * @internal
 */
export interface InternalUserSettingsServiceSetup {
  getUserSettings: (request: KibanaRequest) => Promise<UserSettings>;
  getUserSettingDarkMode: (request: KibanaRequest) => Promise<DarkModeValue | undefined>;
}

/**
 * @internal
 */
export class UserSettingsService {
  private logger: Logger;
  private userProfile?: InternalUserProfileServiceStart;

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('user-settings-service');
  }

  public setup(): InternalUserSettingsServiceSetup {
    const getUserSettings = async (request: KibanaRequest): Promise<UserSettings> => {
      const userSettings = await this.getSettings(request);
      return {
        darkMode: getUserSettingDarkMode(userSettings),
        locale: getUserSettingLocale(userSettings),
        rememberSelectedSpace: getUserSettingRememberSelectedSpace(userSettings),
      };
    };

    return {
      getUserSettings,
      getUserSettingDarkMode: async (request: KibanaRequest) =>
        (await getUserSettings(request)).darkMode,
    };
  }

  public start(deps: UserSettingsServiceStartDeps) {
    this.userProfile = deps.userProfile;
  }

  private async getSettings(request: KibanaRequest) {
    if (this.userProfile) {
      const userProfile = await this.userProfile.getCurrent({
        request,
        dataPath: userSettingsDataPath,
      });
      return userProfile?.data?.[userSettingsDataPath] ?? {};
    } else {
      this.logger.debug('userProfile not set');
      return {};
    }
  }
}

/**
 * Extracts the dark mode setting from the user settings.
 * Returning "undefined" means that we will use the space default settings.
 */
const getUserSettingDarkMode = (
  userSettings: NonNullable<UserProfileData['userSettings']>
): DarkModeValue | undefined => {
  if (userSettings.darkMode) {
    const { darkMode } = userSettings;
    if (darkMode === 'space_default') return undefined;

    return darkMode.toUpperCase() === 'SYSTEM' ? 'system' : darkMode.toUpperCase() === 'DARK';
  }
  return undefined;
};

const getUserSettingLocale = (
  userSettings: NonNullable<UserProfileData['userSettings']>
): string | undefined => {
  return userSettings.locale || undefined;
};

const getUserSettingRememberSelectedSpace = (
  userSettings: NonNullable<UserProfileData['userSettings']>
): boolean => {
  return userSettings.rememberSelectedSpace !== false;
};
