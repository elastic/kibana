/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import { useUserProfilesServices } from './services';

export const userProfileKeys = {
  get: (uid: string) => ['user-profile', uid],
  bulkGet: (uids: string[]) => ['user-profile', { uids }],
  suggest: (name: string) => ['user-profile', 'suggest', name],
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
    staleTime: Infinity,
    enabled: opts?.enabled ?? true,
  });
  return query;
};

/**
 * React Query hook for searching user profiles by name, email, or username.
 *
 * Uses a 30s `staleTime` since suggest results are transient queries.
 * Disabled when `suggestUserProfiles` is not provided (graceful degradation)
 * or when `name` is empty. The caller is responsible for debouncing the `name` input.
 */
export const useSuggestUserProfiles = (name: string, opts?: { enabled?: boolean }) => {
  const { suggestUserProfiles } = useUserProfilesServices();
  return useQuery({
    queryKey: userProfileKeys.suggest(name),
    queryFn: () => {
      if (!suggestUserProfiles) {
        return [];
      }
      return suggestUserProfiles(name);
    },
    enabled: (opts?.enabled ?? true) && !!suggestUserProfiles && name.length > 0,
    staleTime: 30_000,
  });
};
