/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isUserAnonymous } from '@kbn/core-security-common';

import type {
  AuthenticatedUser,
  CurrentUser,
  GetUserProfileResponse,
  UserProfileAvatarData,
  UserSettingsData,
} from './types';

/**
 * Pure mapper that combines the authenticated user and (optional) user profile into the
 * {@link CurrentUser} entity.
 *
 * Precedence rule: the identity fields (`username`/`email`/`fullName`) are derived **only** from
 * `authc`, never from the profile's own `user` projection.
 *
 * @param authc Authenticated user, or `undefined` while the auth request is still loading.
 * @param profile Full user profile response, `null` when the user has no profile (e.g. anonymous
 * or proxy-authenticated users), or `undefined` while the profile request is still loading.
 */
export const buildCurrentUser = (
  authc: AuthenticatedUser | undefined,
  profile: GetUserProfileResponse | null | undefined
): CurrentUser | null => {
  if (!authc) {
    return null;
  }

  const profileData = profile?.data as
    | { avatar?: UserProfileAvatarData; userSettings?: UserSettingsData }
    | undefined;

  return {
    username: authc.username,
    email: authc.email,
    fullName: authc.full_name,
    displayName: authc.full_name || authc.email || authc.username,
    isAnonymous: isUserAnonymous(authc),
    profileUid: authc.profile_uid ?? profile?.uid,
    avatar: profileData?.avatar,
    userSettings: profileData?.userSettings,
  };
};
