/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';

/**
 * Avatar stored in user profile.
 */
export interface UserProfileAvatarData {
  /**
   * Optional initials (two letters) of the user to use as avatar if avatar picture isn't specified.
   */
  initials?: string;
  /**
   * Background color of the avatar when initials are used.
   */
  color?: string;
  /**
   * Base64 data URL for the user avatar image.
   */
  imageUrl?: string | null;
}

export type DarkModeValue = '' | 'dark' | 'light';

/**
 * User settings stored in the data object of the User Profile
 */
export interface UserSettingsData {
  darkMode?: DarkModeValue;
}

export interface UserProfileData {
  avatar?: UserProfileAvatarData;
  userSettings?: UserSettingsData;
  [key: string]: unknown;
}

export interface UserProfileAPIClient {
  userProfile$: Observable<UserProfileData | null>;
  update: <D extends UserProfileData>(data: D) => Promise<void>;
}
