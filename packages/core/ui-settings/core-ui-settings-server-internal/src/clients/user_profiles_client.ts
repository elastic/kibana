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
import { UserProfileWithSecurity } from '@kbn/security-plugin/common';

/**
 * A wrapper client around {@link UserSettingServiceStart} that exposes a method to get the current user's profile
 */
export class UserProfilesClient implements UserProfilesClientContract {
  private userSettingsServiceStart: UserSettingServiceStart;

  constructor(userSettingsServiceStart: UserSettingServiceStart) {
    this.userSettingsServiceStart = userSettingsServiceStart;
  }

  /**
   * Returns the current user's profile
   *
   * @param params the Kibana Request and the 'data path' of the desired values that are stored with in the user's
   * profile 'data' object
   */
  async get(params: UserProfileGetCurrentParams): Promise<UserProfileWithSecurity | null> {
    return await this.userSettingsServiceStart.getCurrent(params);
  }
}
