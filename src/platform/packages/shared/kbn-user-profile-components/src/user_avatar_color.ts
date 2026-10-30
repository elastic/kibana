/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VISUALIZATION_COLORS } from '@elastic/eui';

import type { UserProfileUserInfo } from '@kbn/core-user-profile-common';

import type { UserProfileAvatarData } from './types';
import {
  getUserDisplayName,
  isValidUserProfileAvatarColor,
  USER_AVATAR_FALLBACK_CODE_POINT,
} from './user_profile';

/**
 * Determines the color for the provided user profile.
 * If a color is present on the user profile itself, then that is used.
 * Otherwise, a color is provided from EUI's Visualization Colors based on the display name.
 *
 * This lives apart from `./user_profile` so that server code can import the pure helpers
 * without pulling in `@elastic/eui`.
 *
 * @param {UserProfileUserInfo} user User info
 * @param {UserProfileAvatarData} avatar User avatar
 */
export function getUserAvatarColor(
  user: Pick<UserProfileUserInfo, 'username' | 'full_name'>,
  avatar?: UserProfileAvatarData
): string {
  const avatarColor = avatar?.color;
  if (isValidUserProfileAvatarColor(avatarColor)) {
    return avatarColor;
  }

  const firstCodePoint = getUserDisplayName(user).codePointAt(0) || USER_AVATAR_FALLBACK_CODE_POINT;
  return VISUALIZATION_COLORS[firstCodePoint % VISUALIZATION_COLORS.length];
}
