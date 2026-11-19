/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { AuthenticatedUser } from '@kbn/core-security-common';
export type { GetUserProfileResponse } from '@kbn/core-user-profile-browser';

export interface UserProfileAvatarData {
  /** Optional initials (two letters) of the user to use as avatar if avatar picture isn't specified. */
  initials?: string | null;
  /** Background color of the avatar when initials are used. */
  color?: string | null;
  /** Base64 data URL for the user avatar image. */
  imageUrl?: string | null;
}

/**
 * User-settings data stored in the user profile. Intentionally opaque from Core's perspective —
 * the concrete keys are owned and defined by the plugins that read/write them.
 */
export type UserSettingsData = Record<string, unknown>;

export interface CurrentUser {
  /** The user's login name. */
  username: string;
  /** The user's email address, if one is set. */
  email?: string;
  /** The user's full name, if one is set. */
  fullName?: string;
  /**
   * Human-readable display name, suitable for greetings and labels. Falls back from full name, to
   * email, to username.
   */
  displayName: string;

  /** Whether the user was authenticated via the `anonymous` authentication provider. */
  isAnonymous: boolean;

  /** Identifier of the user's profile, if one exists. */
  profileUid?: string;
  /** The user's avatar, as configured in their user profile. */
  avatar?: UserProfileAvatarData;
  /** Opaque per-plugin settings stored in the user's profile. */
  userSettings?: UserSettingsData;
}
