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
};

export const useUserProfile = (uid: string) => {
  const services = useUserProfilesServices({ strict: false });
  const query = useQuery(
    userProfileKeys.get(uid),
    async () => {
      return services?.getUserProfile(uid);
    },
    {
      staleTime: Infinity,
      // Disable query if services are not available.
      enabled: !!services,
    }
  );
  return query;
};

export const useUserProfiles = (uids: string[], opts?: { enabled?: boolean }) => {
  const services = useUserProfilesServices({ strict: false });
  const query = useQuery({
    queryKey: userProfileKeys.bulkGet(uids),
    queryFn: () => {
      if (!services?.bulkGetUserProfiles) {
        return [];
      }
      return services.bulkGetUserProfiles(uids);
    },
    staleTime: Infinity,
    // Disable query if services are not available.
    enabled: (opts?.enabled ?? true) && !!services,
  });
  return query;
};
