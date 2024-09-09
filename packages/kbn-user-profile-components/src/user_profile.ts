/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VISUALIZATION_COLORS } from '@elastic/eui';
import type { UserProfileAvatarData, UserProfileData } from './types';

/**
 * IMPORTANT:
 *
 * The types in this file have been imported from
 * `x-pack/plugins/security/common/model/user_profile.ts`
 *
 * When making changes please ensure to keep both files in sync.
 */

/**
 * Describes basic properties stored in user profile.
 */
export interface UserProfile<D extends UserProfileData = UserProfileData> {
  /**
   * Unique ID for of the user profile.
   */
  uid: string;

  /**
   * Indicates whether user profile is enabled or not.
   */
  enabled: boolean;

  /**
   * Information about the user that owns profile.
   */
  user: UserProfileUserInfo;

  /**
   * User specific data associated with the profile.
   */
  data: Partial<D>;
}

/**
 * Basic user information returned in user profile.
 */
export interface UserProfileUserInfo {
  /**
   * Username of the user.
   */
  username: string;
  /**
   * Optional email of the user.
   */
  email?: string;
  /**
   * Optional full name of the user.
   */
  full_name?: string;
}

export const USER_AVATAR_FALLBACK_CODE_POINT = 97; // code point for lowercase "a"
export const USER_AVATAR_MAX_INITIALS = 2;

/**
 * Determines the color for the provided user profile.
 * If a color is present on the user profile itself, then that is used.
 * Otherwise, a color is provided from EUI's Visualization Colors based on the display name.
 *
 * @param {UserProfileUserInfo} user User info
 * @param {UserProfileAvatarData} avatar User avatar
 */
export function getUserAvatarColor(
  user: Pick<UserProfileUserInfo, 'username' | 'full_name'>,
  avatar?: UserProfileAvatarData
) {
  if (avatar && avatar.color) {
    return avatar.color;
  }

  const firstCodePoint = getUserDisplayName(user).codePointAt(0) || USER_AVATAR_FALLBACK_CODE_POINT;

  return VISUALIZATION_COLORS[firstCodePoint % VISUALIZATION_COLORS.length];
}

/**
 * Determines the initials for the provided user profile.
 * If initials are present on the user profile itself, then that is used.
 * Otherwise, the initials are calculated based off the words in the display name, with a max length of 2 characters.
 *
 * @param {UserProfileUserInfo} user User info
 * @param {UserProfileAvatarData} avatar User avatar
 */
export function getUserAvatarInitials(
  user: Pick<UserProfileUserInfo, 'username' | 'full_name'>,
  avatar?: UserProfileAvatarData
) {
  if (avatar && avatar.initials) {
    return avatar.initials;
  }

  const words = getUserDisplayName(user).split(' ');
  const numInitials = Math.min(USER_AVATAR_MAX_INITIALS, words.length);

  words.splice(numInitials, words.length);

  return words.map((word) => word.substring(0, 1)).join('');
}

/**
 * Set of available name-related fields to pick as display name.
 */
export interface GetUserDisplayNameParams {
  /**
   * Username of the user.
   */
  username: string;

  /**
   * Optional email of the user.
   */
  email?: string;

  /**
   * Optional full name of the user.
   */
  full_name?: string;
}

/**
 * Determines the display name for the provided user information.
 * @param params Set of available user's name-related fields.
 */
export function getUserDisplayName(params: GetUserDisplayNameParams) {
  return params.full_name || params.email || params.username;
}

/**
 * Determines the display label for the provided user information.
 * Includes the email if it is different from the display name.
 * @param params Set of available user's name-related fields.
 */
export function getUserDisplayLabel(user: GetUserDisplayNameParams): string {
  const displayName = getUserDisplayName(user);
  if (user.email && user.email !== displayName) {
    return `${displayName} (${user.email})`;
  }
  return displayName;
}
