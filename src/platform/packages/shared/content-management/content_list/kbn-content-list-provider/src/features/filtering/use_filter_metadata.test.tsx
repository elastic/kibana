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
import type { FindItemsParams, FindItemsResult, FilterFacet } from '../../..';
import { ContentListProvider } from '../../..';
import { useFilterMetadata } from './use_filter_metadata';
import { TAG_FILTER_ID } from '../../datasource';
import { contentListQueryClient } from '../../query';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [{ id: 'item-1', title: 'Item 1' }],
    total: 1,
  })
);

const mockFacets: FilterFacet[] = [
  { key: 'tag-1', label: 'Production', count: 5 },
  { key: 'tag-2', label: 'Development', count: 2 },
];

const createWrapper = (features: Record<string, unknown> = {}) => {
  return ({ children }: { children: React.ReactNode }) => (
    <ContentListProvider
      id="test-scope"
      labels={{ entity: 'item', entityPlural: 'items' }}
      dataSource={{ findItems: mockFindItems }}
      features={features}
    >
      {children}
    </ContentListProvider>
  );
};

describe('useFilterMetadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contentListQueryClient.clear();
  });

  it('returns undefined data when the feature is boolean true (no FilterFeatureConfig)', () => {
    const { result } = renderHook(() => useFilterMetadata(TAG_FILTER_ID), {
      wrapper: createWrapper({ tags: true }),
    });

    // No `getMetadata` to call — query should remain disabled.
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns undefined data when the feature is false', () => {
    const { result } = renderHook(() => useFilterMetadata(TAG_FILTER_ID), {
      wrapper: createWrapper({ tags: false }),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns undefined data when the feature is not configured at all', () => {
    const { result } = renderHook(() => useFilterMetadata(TAG_FILTER_ID), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
  });

  it('calls getMetadata and returns facets when FilterFeatureConfig is provided', async () => {
    const getMetadata = jest.fn().mockResolvedValue(mockFacets);

    const { result } = renderHook(() => useFilterMetadata(TAG_FILTER_ID), {
      wrapper: createWrapper({ tags: { getMetadata } }),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data).toEqual(mockFacets);
    expect(getMetadata).toHaveBeenCalledTimes(1);
  });

  it('does not call getMetadata when `enabled: false` is passed', () => {
    const getMetadata = jest.fn().mockResolvedValue(mockFacets);

    renderHook(() => useFilterMetadata(TAG_FILTER_ID, { enabled: false }), {
      wrapper: createWrapper({ tags: { getMetadata } }),
    });

    expect(getMetadata).not.toHaveBeenCalled();
  });

  it('calls getMetadata when `enabled` transitions from false to true', async () => {
    const getMetadata = jest.fn().mockResolvedValue(mockFacets);
    let enabled = false;

    const { result, rerender } = renderHook(() => useFilterMetadata(TAG_FILTER_ID, { enabled }), {
      wrapper: createWrapper({ tags: { getMetadata } }),
    });

    expect(getMetadata).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();

    enabled = true;
    rerender();

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(getMetadata).toHaveBeenCalledTimes(1);
  });

  it('works for the createdBy filter dimension', async () => {
    const createdByFacets: FilterFacet[] = [{ key: 'u_jane', label: 'Jane Doe', count: 3 }];
    const getMetadata = jest.fn().mockResolvedValue(createdByFacets);

    const { result } = renderHook(() => useFilterMetadata('createdBy'), {
      wrapper: createWrapper({ createdBy: { getMetadata } }),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual(createdByFacets);
  });

  it('excludes the target filter from the params passed to getMetadata (faceted-search)', async () => {
    const getMetadata = jest.fn().mockResolvedValue([]);

    renderHook(() => useFilterMetadata(TAG_FILTER_ID), {
      wrapper: createWrapper({ tags: { getMetadata } }),
    });

    await waitFor(() => expect(getMetadata).toHaveBeenCalled());

    const { filters } = getMetadata.mock.calls[0][0];
    // The tag filter itself should be excluded from the params.
    expect(filters[TAG_FILTER_ID]).toBeUndefined();
  });
});
