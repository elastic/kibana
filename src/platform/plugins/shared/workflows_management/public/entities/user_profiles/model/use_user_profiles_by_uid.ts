/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { useKibana } from '../../../hooks/use_kibana';

const USER_PROFILES_STALE_TIME = 60 * 1000;

const profilesToMap = (profiles: UserProfileWithAvatar[]): Map<string, UserProfileWithAvatar> =>
  profiles.reduce<Map<string, UserProfileWithAvatar>>((acc, profile) => {
    acc.set(profile.uid, profile);
    return acc;
  }, new Map<string, UserProfileWithAvatar>());

export const getExecutedByLabel = (
  profile?: UserProfileWithAvatar,
  fallbackLabel?: string
): string | undefined => {
  if (!profile?.user) return fallbackLabel;

  return getUserDisplayName(profile.user) || fallbackLabel;
};

export const useUserProfilesByUid = ({ enabled, uids }: { enabled: boolean; uids: string[] }) => {
  const { userProfile } = useKibana().services;

  return useQuery<UserProfileWithAvatar[], Error, Map<string, UserProfileWithAvatar>>(
    ['workflowsExecutionListExecutedByUserProfiles', ...uids],
    () => userProfile.bulkGet({ uids: new Set(uids), dataPath: 'avatar' }),
    {
      enabled: enabled && uids.length > 0,
      keepPreviousData: true,
      retry: false,
      select: profilesToMap,
      staleTime: USER_PROFILES_STALE_TIME,
    }
  );
};
