/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserProfile } from '@kbn/user-profile-components';

/**
 * Service interface for user profile lookups.
 *
 * Provided via `services.userProfile` on {@link ContentListProvider}.
 * When present (and `features.createdBy !== false`), enables the
 * "Created by" column and filter.
 */
export interface UserProfileService {
  /** Fetch a single user profile by UID. */
  getUserProfile: (uid: string) => Promise<UserProfile>;
  /** Fetch multiple user profiles by UIDs. */
  bulkGetUserProfiles: (uids: string[]) => Promise<UserProfile[]>;
}
