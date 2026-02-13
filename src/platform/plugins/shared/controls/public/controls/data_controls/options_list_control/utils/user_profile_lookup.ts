/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { coreServices } from '../../../../services/kibana_services';

const userProfilesCache = new Map<string, UserProfileWithAvatar | null>();
const inFlight = new Set<string>();

const CONTROLS_SUGGEST_USERS_PATH = '/internal/controls/user_profile/_suggest';

/**
 * Returns a cached user profile for `uid`.
 * - `undefined`: not loaded yet
 * - `null`: attempted to load but not found / not returned
 */
export const getCachedUserProfileWithAvatar = (
  uid: string
): UserProfileWithAvatar | null | undefined => userProfilesCache.get(uid);

/**
 * Best-effort bulk-get of user profiles with avatar data.
 *
 * This depends on the Security plugin's internal bulk-get endpoint. If it is unavailable
 * (security disabled) or access is forbidden (missing privileges), this function will
 * reject and the caller should fall back to default rendering.
 */
export const bulkGetUserProfilesWithAvatar = async (uids: string[]): Promise<void> => {
  const unique = Array.from(new Set(uids)).filter((uid) => uid && !userProfilesCache.has(uid));
  const toFetch = unique.filter((uid) => !inFlight.has(uid));
  if (toFetch.length === 0) return;

  toFetch.forEach((uid) => inFlight.add(uid));
  try {
    const profiles = await coreServices.http.post<UserProfileWithAvatar[]>(
      '/internal/security/user_profile/_bulk_get',
      {
        body: JSON.stringify({ uids: toFetch, dataPath: 'avatar' }),
      }
    );

    const returned = new Set<string>();
    profiles.forEach((profile) => {
      returned.add(profile.uid);
      userProfilesCache.set(profile.uid, profile);
    });
    toFetch.forEach((uid) => {
      if (!returned.has(uid)) userProfilesCache.set(uid, null);
    });
  } finally {
    toFetch.forEach((uid) => inFlight.delete(uid));
  }
};

export const suggestUserProfilesWithAvatar = async ({
  name,
  signal,
}: {
  name: string;
  signal?: AbortSignal;
}): Promise<UserProfileWithAvatar[]> => {
  try {
    const trimmed = name.trim();
    const profiles = await coreServices.http.fetch<UserProfileWithAvatar[]>(
      CONTROLS_SUGGEST_USERS_PATH,
      {
        method: 'GET',
        version: '1',
        query: { searchTerm: trimmed },
        signal,
      }
    );
    profiles.forEach((profile) => userProfilesCache.set(profile.uid, profile));
    return profiles;
  } catch {
    return [];
  }
};
