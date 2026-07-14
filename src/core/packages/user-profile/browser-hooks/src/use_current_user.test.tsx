/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { of } from 'rxjs';

import type { CoreAuthenticationService } from '@kbn/core-security-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { CurrentUserProvider } from '@kbn/core-user-profile-browser-context';

import type { AuthenticatedUser, GetUserProfileResponse } from './types';
import { useCurrentUser } from './use_current_user';

const authenticatedUser: AuthenticatedUser = {
  username: 'jdoe',
  email: 'jdoe@elastic.co',
  full_name: 'John Doe',
  roles: ['superuser'],
  enabled: true,
  authentication_realm: { name: 'native1', type: 'native' },
  lookup_realm: { name: 'native1', type: 'native' },
  authentication_provider: { type: 'basic', name: 'basic1' },
  authentication_type: 'realm',
  elastic_cloud_user: false,
  http_authentication_scheme: null,
  profile_uid: 'auth-uid',
  metadata: { _reserved: false },
};

const profileResponse: GetUserProfileResponse = {
  uid: 'profile-uid',
  enabled: true,
  user: {
    username: 'jdoe',
    email: 'jdoe@elastic.co',
    full_name: 'John Doe',
    roles: ['superuser'],
    realm_name: 'native1',
    authentication_provider: { type: 'basic', name: 'basic1' },
  },
  data: { avatar: { initials: 'JD' } },
  labels: {},
};

const createAuthc = (
  getCurrentUser: jest.Mock = jest.fn().mockResolvedValue(authenticatedUser)
): CoreAuthenticationService => ({ getCurrentUser });

// Stable observable instances: `useObservable` resubscribes whenever the observable reference
// changes, so a mock that returns a *new* `of(...)` on every call would resubscribe and
// synchronously re-emit on every render, causing an infinite render loop.
const userProfile$ = of(null);
const enabled$ = of(false);
const dataUpdates$ = of({});

const createUserProfile = (
  getCurrent: jest.Mock = jest.fn().mockResolvedValue(profileResponse)
): UserProfileService =>
  ({
    getCurrent,
    getUserProfile$: () => userProfile$,
    getEnabled$: () => enabled$,
    getDataUpdates$: () => dataUpdates$,
    bulkGet: jest.fn(),
    suggest: jest.fn(),
    update: jest.fn(),
    partialUpdate: jest.fn(),
  } as unknown as UserProfileService);

const createWrapper =
  (authc: CoreAuthenticationService, userProfile: UserProfileService): FC<PropsWithChildren> =>
  ({ children }) =>
    (
      <CurrentUserProvider authc={authc} userProfile={userProfile}>
        {children}
      </CurrentUserProvider>
    );

describe('useCurrentUser', () => {
  it('throws when used outside a CurrentUserProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useCurrentUser())).toThrow(
      'useCurrentUser must be used within a CurrentUserProvider'
    );
    consoleError.mockRestore();
  });

  it('transitions from loading to a resolved user', async () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(createAuthc(), createUserProfile()),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toEqual(
      expect.objectContaining({
        username: 'jdoe',
        displayName: 'John Doe',
        avatar: { initials: 'JD' },
      })
    );
  });

  it('requests auth once and the profile with the bootstrap-prefetched dataPath', async () => {
    const getCurrentUser = jest.fn().mockResolvedValue(authenticatedUser);
    const getCurrent = jest.fn().mockResolvedValue(profileResponse);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(createAuthc(getCurrentUser), createUserProfile(getCurrent)),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getCurrentUser).toHaveBeenCalledTimes(1);
    // The profile is fetched with the same dataPath the security plugin prefetches at start, so the
    // underlying client cache is reused (network dedup happens at the client layer).
    expect(getCurrent).toHaveBeenCalledWith({ dataPath: 'avatar,userSettings' });
  });

  it('skips the profile request entirely for users who cannot have a profile', async () => {
    const anonymousUser: AuthenticatedUser = {
      ...authenticatedUser,
      authentication_provider: { type: 'anonymous', name: 'anon' },
    };
    const getCurrent = jest.fn().mockResolvedValue(profileResponse);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(
        createAuthc(jest.fn().mockResolvedValue(anonymousUser)),
        createUserProfile(getCurrent)
      ),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getCurrent).not.toHaveBeenCalled();
    expect(result.current.user).toEqual(
      expect.objectContaining({ username: 'jdoe', isAnonymous: true, avatar: undefined })
    );
  });

  it('still resolves the user from auth when a permitted profile request unexpectedly 404s', async () => {
    const profileError = { response: { status: 404 } };
    const getCurrent = jest.fn().mockRejectedValue(profileError);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(createAuthc(), createUserProfile(getCurrent)),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // user is still valid from auth, just without profile-derived fields
    expect(result.current.user).toEqual(
      expect.objectContaining({ username: 'jdoe', avatar: undefined })
    );
    expect(result.current.errors.authcError).toBeUndefined();
    expect(result.current.errors.profileError).toBe(profileError);
  });

  it('surfaces a critical auth failure: no user, authcError reported', async () => {
    const authError = new Error('auth boom');
    const getCurrentUser = jest.fn().mockRejectedValue(authError);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(createAuthc(getCurrentUser), createUserProfile()),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.errors.authcError).toBe(authError);
    expect(result.current.errors.profileError).toBeUndefined();
  });

  it('resolves the user from auth alone when the (non-critical) profile request fails', async () => {
    const profileError = Object.assign(new Error('profile boom'), {
      response: { status: 500 },
    });
    const getCurrent = jest.fn().mockRejectedValue(profileError);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(createAuthc(), createUserProfile(getCurrent)),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toEqual(expect.objectContaining({ username: 'jdoe' }));
    expect(result.current.errors.authcError).toBeUndefined();
    expect(result.current.errors.profileError).toBe(profileError);
  });
});
