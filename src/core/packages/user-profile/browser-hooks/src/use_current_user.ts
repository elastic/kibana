/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContext, useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import useObservable from 'react-use/lib/useObservable';

import { canUserHaveProfile } from '@kbn/core-security-common';
import { CurrentUserContext } from '@kbn/core-user-profile-browser-context';

import { buildCurrentUser } from './build_current_user';
import type { CurrentUser } from './types';

/**
 * The profile `dataPath` requested by the hook. It intentionally matches the paths the security
 * plugin prefetches at start (`avatar,userSettings`) so the underlying API client cache (keyed by
 * the exact `dataPath` string) is reused instead of issuing a second request.
 */
export const CURRENT_USER_DATA_PATH = 'avatar,userSettings';

export interface UseCurrentUserResult {
  /** The current user, or `null` while loading or if authentication failed. */
  user: CurrentUser | null;
  /** Whether either the auth or profile request is still in flight. */
  isLoading: boolean;
  errors: {
    /** Set if the authenticated user request failed. */
    authcError?: Error;
    /** Set if the profile request failed (only attempted for users who can have a profile). */
    profileError?: Error;
  };
}

/**
 * Returns the current user (authenticated user + profile) unified into a single result. Network
 * requests are deduped by the underlying client caches.
 *
 * @example
 * const { user, isLoading } = useCurrentUser();
 */
export function useCurrentUser(): UseCurrentUserResult {
  const services = useContext(CurrentUserContext);
  if (!services) {
    throw new Error('useCurrentUser must be used within a CurrentUserProvider');
  }
  const { authc, userProfile } = services;

  const authState = useAsync(() => authc.getCurrentUser(), [authc]);

  const dataUpdate = useObservable(userProfile.getDataUpdates$());

  const profileState = useAsync(async () => {
    // Anonymous and proxy-authenticated users don't have profiles; skip the request entirely.
    if (!authState.value || !canUserHaveProfile(authState.value)) {
      return null;
    }

    return await userProfile.getCurrent({ dataPath: CURRENT_USER_DATA_PATH });
  }, [userProfile, authState.value, dataUpdate]);

  const user = useMemo(
    () => buildCurrentUser(authState.value, profileState.value),
    [authState.value, profileState.value]
  );

  return {
    user,
    isLoading: authState.loading || profileState.loading,
    errors: {
      authcError: authState.error,
      profileError: profileState.error,
    },
  };
}
