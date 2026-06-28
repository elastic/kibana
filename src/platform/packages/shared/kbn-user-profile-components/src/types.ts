/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';

import type { UserProfileData } from '@kbn/core-user-profile-common';
import type {
  ContrastModeValue,
  DarkModeValue,
  LocaleValue,
  UserProfileAvatarData,
  UserSettingsData,
} from '@kbn/core-user-settings-types';

<<<<<<< HEAD
export type {
  UserProfileAvatarData,
  DarkModeValue,
  ContrastModeValue,
  LocaleValue,
  UserSettingsData,
  UserProfileData,
};
=======
export type DarkModeValue = 'system' | 'dark' | 'light' | 'space_default';

export type ContrastModeValue = 'system' | 'standard' | 'high';

/**
 * User settings stored in the data object of the User Profile
 */
export interface UserSettingsData {
  darkMode?: DarkModeValue;
  contrastMode?: ContrastModeValue;
  solutionNavOptOut?: boolean;
  /**
   * Whether the Agent Builder announcement modal was dismissed for the current user (all spaces).
   */
  agentBuilderAnnouncementModalSeen?: boolean;
  /**
   * Legacy: stringified JSON map of space id → dismissed (`true`). Superseded by
   * `agentBuilderAnnouncementModalSeen`; read for backward compatibility.
   */
  agentBuilderAnnouncementModalSeenBySpaceJson?: string;
}

export interface UserProfileData {
  avatar?: UserProfileAvatarData;
  userSettings?: UserSettingsData;
  [key: string]: unknown;
}
>>>>>>> 9.4

export interface UserProfileAPIClient {
  userProfile$: Observable<UserProfileData | null>;
  enabled$: Observable<boolean>;
  userProfileLoaded$: Observable<boolean>;
  partialUpdate: <D extends Partial<UserProfileData>>(data: D) => Promise<void>;
}
