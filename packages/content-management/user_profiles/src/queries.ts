/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@tanstack/react-query';
import { useUserProfilesServices } from './services';

export const userProfileKeys = {
  get: (uid: string) => ['user-profile', uid],
  bulkGet: (uids: string[]) => ['user-profile', { uids }],
};

export const useUserProfile = (uid: string) => {
  const { getUserProfile } = useUserProfilesServices();
  const query = useQuery(
    userProfileKeys.get(uid),
    async () => {
      return getUserProfile(uid);
    },
    { staleTime: Infinity }
  );
  return query;
};

export const useUserProfiles = (uids: string[], opts?: { enabled?: boolean }) => {
  const { bulkGetUserProfiles } = useUserProfilesServices();
  const query = useQuery({
    queryKey: userProfileKeys.bulkGet(uids),
    queryFn: () => bulkGetUserProfiles(uids),
    enabled: opts?.enabled ?? true,
  });
  return query;
};
