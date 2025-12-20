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
 * Mock user profiles matching the user IDs used in mock dashboard/content data.
 * These correspond to the MOCK_USERS array in types.ts.
 */
export const MOCK_USER_PROFILES: UserProfile[] = [
  {
    uid: 'u_665722084_cloud',
    enabled: true,
    data: {},
    user: {
      username: 'cloud_user',
      email: 'cloud.user@elastic.co',
      full_name: 'Cloud User',
    },
  },
  {
    uid: 'u_admin_local',
    enabled: true,
    data: {},
    user: {
      username: 'admin_local',
      email: 'admin@elastic.co',
      full_name: 'Admin Local',
    },
  },
  {
    uid: 'u_jane_doe',
    enabled: true,
    data: {},
    user: {
      username: 'jane.doe',
      email: 'jane.doe@elastic.co',
      full_name: 'Jane Doe',
    },
  },
  {
    uid: 'u_john_smith',
    enabled: true,
    data: {},
    user: {
      username: 'john.smith',
      email: 'john.smith@elastic.co',
      full_name: 'John Smith',
    },
  },
  {
    uid: 'u_analyst_1',
    enabled: true,
    data: {},
    user: {
      username: 'analyst1',
      email: 'analyst1@elastic.co',
      full_name: 'Data Analyst',
    },
  },
];

/**
 * Map of user IDs to user profiles for quick lookup
 */
export const MOCK_USER_PROFILES_MAP: Record<string, UserProfile> = MOCK_USER_PROFILES.reduce(
  (acc, profile) => {
    acc[profile.uid] = profile;
    return acc;
  },
  {} as Record<string, UserProfile>
);

/**
 * Mock user profile service functions for storybook
 */
const mockGetUserProfile = async (uid: string) => {
  return MOCK_USER_PROFILES_MAP[uid] || { uid, user: { username: uid }, enabled: true, data: {} };
};

const mockBulkGetUserProfiles = async (uids: string[]) => {
  return uids.map(
    (uid) =>
      MOCK_USER_PROFILES_MAP[uid] || { uid, user: { username: uid }, enabled: true, data: {} }
  );
};

export const mockUserProfileServices = {
  getUserProfile: mockGetUserProfile,
  bulkGetUserProfiles: mockBulkGetUserProfiles,
};
