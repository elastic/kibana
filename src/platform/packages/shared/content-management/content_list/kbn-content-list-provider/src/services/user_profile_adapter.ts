/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { UserProfilesServices } from '@kbn/content-management-user-profiles';

/**
 * Creates a `UserProfilesServices` adapter from Kibana's `core.userProfile` service.
 *
 * This utility eliminates duplicate implementations across Kibana providers by providing
 * a consistent way to wrap the core user profile service.
 *
 * @param userProfile - The core user profile service from `coreStart.userProfile`.
 * @returns A `UserProfilesServices` object compatible with `ContentListProvider`.
 *
 * @example
 * ```tsx
 * const userProfileService = createUserProfileAdapter(coreStart.userProfile);
 *
 * // Use in services object.
 * const services = {
 *   userProfile: userProfileService,
 *   // ...other services
 * };
 * ```
 */
export const createUserProfileAdapter = (
  userProfile: CoreStart['userProfile']
): UserProfilesServices => ({
  /**
   * Fetches multiple user profiles by their UIDs.
   * Returns an empty array if no UIDs are provided.
   */
  bulkGetUserProfiles: async (uids: string[]) => {
    if (uids.length === 0) {
      return [];
    }
    return userProfile.bulkGet({ uids: new Set(uids), dataPath: 'avatar' });
  },

  /**
   * Fetches a single user profile by UID.
   * Uses `bulkGet` under the hood for consistency.
   */
  getUserProfile: async (uid: string) => {
    const profiles = await userProfile.bulkGet({
      uids: new Set([uid]),
      dataPath: 'avatar',
    });
    return profiles[0];
  },
});
