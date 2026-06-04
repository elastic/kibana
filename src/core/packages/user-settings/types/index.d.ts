/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SupportedLocaleId } from '@kbn/i18n';

/**
 * Avatar stored in user profile.
 */
export interface UserProfileAvatarData {
  /**
   * Optional initials (two letters) of the user to use as avatar if avatar picture isn't specified.
   */
  initials?: string | null;
  /**
   * Background color of the avatar when initials are used.
   */
  color?: string | null;
  /**
   * Base64 data URL for the user avatar image.
   */
  imageUrl?: string | null;
}

export type DarkModeValue = 'system' | 'dark' | 'light' | 'space_default';

export type ContrastModeValue = 'system' | 'standard' | 'high';

/**
 * Value stored in the user profile for the display language.
 *
 * An empty string `""` means "no explicit choice" (fall back to the server-configured
 * locale at render time). A `SupportedLocaleId` means the user has picked that locale.
 */
export type LocaleValue = SupportedLocaleId | '';

/**
 * User settings stored in the data object of the User Profile.
 */
export interface UserSettingsData {
  darkMode?: DarkModeValue;
  contrastMode?: ContrastModeValue;
  locale?: LocaleValue;
  solutionNavOptOut?: boolean;
  /**
   * Whether the user wants to be redirected to the last accessed space on login.
   * @default true
   */
  rememberSelectedSpace?: boolean;
  /**
   * The id of the last space the user navigated into. Persisted server-side on every
   * `/spaces/enter` request when `rememberSelectedSpace` is true.
   */
  lastSelectedSpaceId?: string | null;
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

// Register the known Kibana user settings fields with the core user-profile common package.
// Any package that either imports @kbn/core-user-settings-types adds @kbn/core-user-settings-types to it's types field in tsconfig.json
// sees UserProfileData with these fields.
declare module '@kbn/core-user-profile-common' {
  interface UserProfileData {
    avatar?: UserProfileAvatarData;
    userSettings?: UserSettingsData;
  }
}
