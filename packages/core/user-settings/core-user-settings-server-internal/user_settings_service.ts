/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreContext } from '@kbn/core-base-server-internal';
import { Logger } from '@kbn/logging';
import { KibanaRequest } from '@kbn/core-http-server';
import { DarkModeValue } from '@kbn/core-ui-settings-common';
import { UserProfileSettingsClientContract } from '@kbn/core-user-settings-server';

/**
 * @internal
 */
export interface InternalUserSettingsServiceSetup {
  setUserProfileSettings: (client: UserProfileSettingsClientContract) => void;
  getUserSettingDarkMode: (request: KibanaRequest) => Promise<DarkModeValue | undefined>;
}

export class UserSettingsService {
  private logger: Logger;
  private client?: UserProfileSettingsClientContract;

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('user-settings-service');
  }

  public setup(): InternalUserSettingsServiceSetup {
    return {
      setUserProfileSettings: (client: UserProfileSettingsClientContract) => {
        this.client = client;
      },
      getUserSettingDarkMode: async (request: KibanaRequest) => {
        const userSettings = await this.getSettings(request);
        return this.getUserSettingDarkMode(userSettings);
      },
    };
  }

  private async getSettings(request: KibanaRequest): Promise<Record<string, string>> {
    let result = {};
    if (this.client) {
      result = (await this.client.get(request)) as Record<string, string>;
    } else {
      this.logger.debug('UserProfileSettingsClient not set');
    }

    return result;
  }

  private async getUserSettingDarkMode(
    userSettings: Record<string, string>
  ): Promise<DarkModeValue | undefined> {
    let result;

    if (userSettings?.darkMode) {
      result = userSettings.darkMode.toUpperCase() === 'DARK';
    }

    return result;
  }
}
