/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import type { UserProfileAvatarData } from '@kbn/user-profile-components';
import type { ContentListUserProfilesServices } from '@kbn/content-list-provider';

/**
 * Build a {@link ContentListUserProfilesServices} for
 * `ContentListClientProvider`'s `services.userProfiles` slot from the core
 * user-profile service.
 *
 * The factory wraps `userProfile.bulkGet({ uids, dataPath: 'avatar' })` and
 * shapes each profile into the `UserProfileEntry` form used by the provider's
 * `ProfileCache` (`{ uid, user, avatar, email, fullName }`).
 *
 * `email` is coalesced to `''` and `fullName` falls back to the username when
 * unset, matching the convention used by the legacy `TableListView` user
 * profile filter.
 *
 * Calls with an empty `uids` array short-circuit and return `[]` without
 * issuing a request.
 *
 * @example
 * ```ts
 * const userProfiles = createUserProfilesService(coreServices.userProfile);
 * ```
 */
export const createUserProfilesService = (
  userProfile: UserProfileServiceStart
): ContentListUserProfilesServices => ({
  bulkResolve: async (uids: string[]) => {
    if (uids.length === 0) {
      return [];
    }
    const profiles = await userProfile.bulkGet<{
      avatar?: UserProfileAvatarData;
    }>({
      uids: new Set(uids),
      dataPath: 'avatar',
    });
    return profiles.map(({ uid, user, data }) => ({
      uid,
      user,
      avatar: data?.avatar,
      email: user.email ?? '',
      fullName: user.full_name ?? user.username,
    }));
  },
});
