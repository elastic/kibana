/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import React, { FC, PropsWithChildren, useCallback, useContext, useMemo } from 'react';
import type { UserProfile } from '@kbn/user-profile-components';
import { createBatcher } from './utils/batcher';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30 * 60 * 1000 } },
});

export interface UserProfilesKibanaDependencies {
  core: {
    userProfile: {
      bulkGet: UserProfileServiceStart['bulkGet'];
    };
  };
}

export interface UserProfilesServices {
  bulkGetUserProfiles: (uids: string[]) => Promise<UserProfile[]>;
  getUserProfile: (uid: string) => Promise<UserProfile>;
}

const UserProfilesContext = React.createContext<UserProfilesServices | null>(null);

export const UserProfilesProvider: FC<PropsWithChildren<UserProfilesServices>> = ({
  children,
  ...services
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProfilesContext.Provider value={services}>{children}</UserProfilesContext.Provider>
    </QueryClientProvider>
  );
};

export const UserProfilesKibanaProvider: FC<PropsWithChildren<UserProfilesKibanaDependencies>> = ({
  children,
  core,
}) => {
  const bulkGetUserProfiles = useCallback<(userProfileIds: string[]) => Promise<UserProfile[]>>(
    async (uids: string[]) => {
      if (uids.length === 0) return [];

      return core.userProfile.bulkGet({ uids: new Set(uids), dataPath: 'avatar' });
    },
    [core.userProfile]
  );

  const getUserProfile = useMemo(() => {
    return createBatcher({
      fetcher: bulkGetUserProfiles,
      resolver: (users, id) => users.find((u) => u.uid === id)!,
    }).fetch;
  }, [bulkGetUserProfiles]);

  return (
    <UserProfilesProvider getUserProfile={getUserProfile} bulkGetUserProfiles={bulkGetUserProfiles}>
      {children}
    </UserProfilesProvider>
  );
};

export function useUserProfilesServices() {
  const context = useContext(UserProfilesContext);

  if (!context) {
    throw new Error(
      'UserProfilesContext is missing. Ensure your component or React root is wrapped with <UserProfilesProvider />'
    );
  }

  return context;
}
