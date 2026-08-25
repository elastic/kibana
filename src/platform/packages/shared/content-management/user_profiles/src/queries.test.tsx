/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { UserProfile } from '@kbn/user-profile-components';
import { UserProfilesProvider, type UserProfilesServices } from './services';
import { useSuggestUserProfiles } from './queries';

const mockProfile: UserProfile = {
  uid: 'u_jane',
  enabled: true,
  data: {},
  user: { username: 'jane', email: 'jane@example.com', full_name: 'Jane Doe' },
};

const createWrapper = (services: UserProfilesServices) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <UserProfilesProvider {...services}>{children}</UserProfilesProvider>
    </QueryClientProvider>
  );
};

const baseServices: UserProfilesServices = {
  getUserProfile: jest.fn(),
  bulkGetUserProfiles: jest.fn(),
};

describe('useSuggestUserProfiles', () => {
  it('is disabled when `suggestUserProfiles` is not provided.', () => {
    const { result } = renderHook(() => useSuggestUserProfiles('jane'), {
      wrapper: createWrapper(baseServices),
    });

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('is disabled when `name` is empty.', () => {
    const suggestUserProfiles = jest.fn().mockResolvedValue([mockProfile]);
    const { result } = renderHook(() => useSuggestUserProfiles(''), {
      wrapper: createWrapper({ ...baseServices, suggestUserProfiles }),
    });

    expect(result.current.isFetching).toBe(false);
    expect(suggestUserProfiles).not.toHaveBeenCalled();
  });

  it('calls the service and returns profiles when enabled.', async () => {
    const suggestUserProfiles = jest.fn().mockResolvedValue([mockProfile]);
    const { result } = renderHook(() => useSuggestUserProfiles('jane'), {
      wrapper: createWrapper({ ...baseServices, suggestUserProfiles }),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(suggestUserProfiles).toHaveBeenCalledWith('jane');
    expect(result.current.data).toEqual([mockProfile]);
  });
});
