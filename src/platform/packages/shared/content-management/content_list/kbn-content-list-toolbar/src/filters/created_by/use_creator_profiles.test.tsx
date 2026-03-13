/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import {
  ContentListProvider,
  contentListQueryClient,
  type FindItemsResult,
  type FindItemsParams,
  type FilterFeatureConfig,
} from '@kbn/content-list-provider';
import { useCreatorProfiles } from './use_creator_profiles';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const createWrapper = (options?: { createdByConfig?: FilterFeatureConfig }) => {
  const { createdByConfig } = options ?? {};
  return ({ children }: { children: React.ReactNode }) => (
    <ContentListProvider
      id="test-list"
      labels={{ entity: 'item', entityPlural: 'items' }}
      dataSource={{ findItems: mockFindItems }}
      features={createdByConfig ? { createdBy: createdByConfig } : {}}
    >
      {children}
    </ContentListProvider>
  );
};

describe('useCreatorProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contentListQueryClient.clear();
  });

  it('returns isReady=true even when popover is closed', () => {
    const config: FilterFeatureConfig = {
      getMetadata: jest.fn().mockResolvedValue([]),
    };

    const { result } = renderHook(() => useCreatorProfiles(false), {
      wrapper: createWrapper({ createdByConfig: config }),
    });

    expect(result.current.isReady).toBe(true);
  });

  it('returns isReady=true when popover is open', () => {
    const config: FilterFeatureConfig = {
      getMetadata: jest.fn().mockResolvedValue([]),
    };

    const { result } = renderHook(() => useCreatorProfiles(true), {
      wrapper: createWrapper({ createdByConfig: config }),
    });

    expect(result.current.isReady).toBe(true);
  });

  it('seeds sentinel entries in emailToUid before facets load', () => {
    const config: FilterFeatureConfig = {
      getMetadata: jest.fn().mockResolvedValue([]),
    };

    const { result } = renderHook(() => useCreatorProfiles(false), {
      wrapper: createWrapper({ createdByConfig: config }),
    });

    expect(result.current.emailToUid.get('managed')).toBe('__managed__');
    expect(result.current.emailToUid.get('none')).toBe('__no_creator__');
  });

  it('does not fire getMetadata when popover is closed', () => {
    const getMetadata = jest.fn().mockResolvedValue([]);
    const config: FilterFeatureConfig = { getMetadata };

    renderHook(() => useCreatorProfiles(false), {
      wrapper: createWrapper({ createdByConfig: config }),
    });

    expect(getMetadata).not.toHaveBeenCalled();
  });

  it('returns undefined facets when popover is closed (metadata not yet fetched)', () => {
    const config: FilterFeatureConfig = {
      getMetadata: jest.fn().mockResolvedValue([]),
    };

    const { result } = renderHook(() => useCreatorProfiles(false), {
      wrapper: createWrapper({ createdByConfig: config }),
    });

    expect(result.current.facets).toBeUndefined();
  });
});
