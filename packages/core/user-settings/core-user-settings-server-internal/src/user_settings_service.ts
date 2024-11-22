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

export interface UserSettingsServiceStartDeps {
  userProfile: InternalUserProfileServiceStart;
}

const userSettingsDataPath = 'userSettings';

/**
 * @internal
 */
export interface InternalUserSettingsServiceSetup {
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
    return {
      getUserSettingDarkMode: async (request: KibanaRequest) => {
        const userSettings = await this.getSettings(request);
        return getUserSettingDarkMode(userSettings);
      },
    };
  }

  public start(deps: UserSettingsServiceStartDeps) {
    this.userProfile = deps.userProfile;
  }

  private async getSettings(request: KibanaRequest): Promise<Record<string, string>> {
    if (this.userProfile) {
      const userProfile = await this.userProfile.getCurrent({
        request,
        dataPath: userSettingsDataPath,
      });
      return (userProfile?.data?.[userSettingsDataPath] ?? {}) as Record<string, string>;
    } else {
      this.logger.debug('userProfile not set');
      return {};
    }
  }
}

const getUserSettingDarkMode = (
  userSettings: Record<string, string>
): DarkModeValue | undefined => {
  if (userSettings?.darkMode) {
    return userSettings.darkMode.toUpperCase() === 'DARK';
  }
  return undefined;
};
