/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ContentListProvider, type FindItemsResult, type FindItemsParams } from '../../../..';
import type { UserProfileService } from '../../../services';
import { useContentListUserFilter } from './use_content_list_user_filter';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const mockUserProfileService: UserProfileService = {
  getUserProfile: jest.fn(),
  bulkGetUserProfiles: jest.fn(),
};

const createWrapper =
  (options: { withService?: boolean } = {}) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'item', entityPlural: 'items' }}
        dataSource={{ findItems: mockFindItems }}
        services={options.withService ? { userProfile: mockUserProfileService } : undefined}
      >
        {children}
      </ContentListProvider>
    );

describe('useContentListUserFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty selectedUsers by default', () => {
    const { result } = renderHook(() => useContentListUserFilter(), {
      wrapper: createWrapper({ withService: true }),
    });

    expect(result.current.selectedUsers).toEqual([]);
    expect(result.current.hasActiveFilter).toBe(false);
  });

  it('reports isSupported as true when user profile service is provided', () => {
    const { result } = renderHook(() => useContentListUserFilter(), {
      wrapper: createWrapper({ withService: true }),
    });

    expect(result.current.isSupported).toBe(true);
  });

  it('reports isSupported as false when user profile service is not provided', () => {
    const { result } = renderHook(() => useContentListUserFilter(), {
      wrapper: createWrapper({ withService: false }),
    });

    expect(result.current.isSupported).toBe(false);
  });

  it('updates selectedUsers when setSelectedUsers is called', () => {
    const { result } = renderHook(() => useContentListUserFilter(), {
      wrapper: createWrapper({ withService: true }),
    });

    act(() => {
      result.current.setSelectedUsers({ uid: ['user-1', 'user-2'], query: {} });
    });

    expect(result.current.selectedUsers).toEqual(['user-1', 'user-2']);
    expect(result.current.hasActiveFilter).toBe(true);
  });

  it('clears users when setSelectedUsers is called with undefined', () => {
    const { result } = renderHook(() => useContentListUserFilter(), {
      wrapper: createWrapper({ withService: true }),
    });

    act(() => {
      result.current.setSelectedUsers({ uid: ['user-1'], query: {} });
    });

    expect(result.current.hasActiveFilter).toBe(true);

    act(() => {
      result.current.setSelectedUsers(undefined);
    });

    expect(result.current.selectedUsers).toEqual([]);
    expect(result.current.hasActiveFilter).toBe(false);
  });
});
