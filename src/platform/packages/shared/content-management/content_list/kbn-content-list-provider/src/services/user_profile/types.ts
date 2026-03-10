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
 * User profile service interface for the content list provider.
 *
 * Provides user profile resolution for rendering avatars and filtering
 * by creator. Consumers supply an implementation that wraps Kibana's
 * `core.userProfile.bulkGet` or an equivalent mock.
 */
export interface UserProfileService {
  /** Fetch a single user profile by uid. */
  getUserProfile: (uid: string) => Promise<UserProfile>;
  /** Fetch multiple user profiles by uid. */
  bulkGetUserProfiles: (uids: string[]) => Promise<UserProfile[]>;
}
