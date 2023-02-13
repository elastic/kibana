/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UserProfilesClientContract } from '@kbn/core-ui-settings-server/src/contracts';
import type { UserSettingServiceStart } from '@kbn/security-plugin/server/user_profile/user_setting_service';
import type { UserProfileGetCurrentParams } from '@kbn/security-plugin/server';

export class UserProfilesClient implements UserProfilesClientContract {
  private userSettingsServiceStart: UserSettingServiceStart;

  constructor(userSettingsServiceStart: UserSettingServiceStart) {
    this.userSettingsServiceStart = userSettingsServiceStart;
  }

  async get(params: UserProfileGetCurrentParams): Promise<any> {
    console.log('Inside user_profiles_client.ts');
    return await this.userSettingsServiceStart.getCurrent(params);
  }
}
