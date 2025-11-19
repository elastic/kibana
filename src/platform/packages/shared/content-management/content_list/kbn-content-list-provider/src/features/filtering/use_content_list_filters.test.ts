/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useContentListFilters } from './use_content_list_filters';
import { renderHookWithProvider } from '../../test_utils';

describe('useContentListFilters', () => {
  it('should return initial default filters', async () => {
    const { result } = await renderHookWithProvider(() => useContentListFilters());

    expect(result.current.filters).toEqual({
      search: undefined,
      tags: {
        include: [],
        exclude: [],
      },
      users: [],
      starredOnly: false,
    });
  });

  it('should update filters when setFilters is called', async () => {
    const { result } = await renderHookWithProvider(() => useContentListFilters());

    const newFilters = {
      tags: { include: ['tag-1', 'tag-2'], exclude: [] },
      users: ['user-1'],
      starredOnly: true,
    };

    act(() => {
      result.current.setFilters(newFilters);
    });

    expect(result.current.filters).toEqual(newFilters);
  });

  it('should clear filters when clearFilters is called', async () => {
    const { result } = await renderHookWithProvider(() => useContentListFilters());

    // Set some filters
    act(() => {
      result.current.setFilters({
        tags: { include: ['tag-1'], exclude: [] },
        starredOnly: true,
      });
    });

    expect(result.current.filters).toEqual({
      tags: { include: ['tag-1'], exclude: [] },
      starredOnly: true,
    });

    // Clear them
    act(() => {
      result.current.clearFilters();
    });

    // clearFilters resets to the default filter shape.
    expect(result.current.filters).toEqual({
      search: undefined,
      tags: {
        include: [],
        exclude: [],
      },
      users: [],
      starredOnly: false,
    });
  });

  it('should handle tag filters', async () => {
    const { result } = await renderHookWithProvider(() => useContentListFilters());

    act(() => {
      result.current.setFilters({ tags: { include: ['tag-1', 'tag-2'], exclude: ['tag-3'] } });
    });

    expect(result.current.filters.tags).toEqual({
      include: ['tag-1', 'tag-2'],
      exclude: ['tag-3'],
    });
  });

  it('should handle user filters', async () => {
    const { result } = await renderHookWithProvider(() => useContentListFilters());

    act(() => {
      result.current.setFilters({ users: ['user-1'] });
    });

    expect(result.current.filters.users).toEqual(['user-1']);
  });

  it('should handle starredOnly filter', async () => {
    const { result } = await renderHookWithProvider(() => useContentListFilters());

    act(() => {
      result.current.setFilters({ starredOnly: true });
    });

    expect(result.current.filters.starredOnly).toBe(true);
  });

  it('should provide setFilters function', async () => {
    const { result } = await renderHookWithProvider(() => useContentListFilters());

    expect(typeof result.current.setFilters).toBe('function');
  });

  it('should provide clearFilters function', async () => {
    const { result } = await renderHookWithProvider(() => useContentListFilters());

    expect(typeof result.current.clearFilters).toBe('function');
  });

  it('should memoize callbacks', async () => {
    const { result, rerender } = await renderHookWithProvider(() => useContentListFilters());

    const firstSetFilters = result.current.setFilters;
    const firstClearFilters = result.current.clearFilters;

    rerender();

    expect(result.current.setFilters).toBe(firstSetFilters);
    expect(result.current.clearFilters).toBe(firstClearFilters);
  });

  it('should throw error when used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useContentListFilters());
    }).toThrow('ContentList hooks must be used within ContentListProvider');

    consoleError.mockRestore();
  });

  it('should use parseSearchQuery when tags service is available', async () => {
    const mockTags = [
      { id: 'tag-1', name: 'Important', color: '#FF0000', description: '', managed: false },
    ];
    const getTagList = jest.fn(() => mockTags);

    // Test that filters correctly parse tags from query text when tags service is available
    const { result } = await renderHookWithProvider(() => useContentListFilters(), {
      providerOverrides: {
        services: {
          tags: {
            getTagList,
          },
        },
        features: {
          filtering: true,
          search: {
            initialQuery: 'tag:Important test query',
          },
        },
      },
    });

    // Wait for filters to update
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Tags should be extracted from the query via parseSearchQuery
    expect(result.current.filters.tags).toBeDefined();
    expect(result.current.filters.tags?.include).toContain('tag-1');
  });

  it('should merge custom filters from query text', async () => {
    // Test that custom filters are extracted from query text
    const { result } = await renderHookWithProvider(() => useContentListFilters(), {
      providerOverrides: {
        features: {
          search: {
            initialQuery: 'status:active test',
          },
          filtering: {
            custom: {
              status: {
                name: 'Status',
                options: [
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ],
              },
            },
          },
        },
      },
    });

    // Wait for filters to update
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Custom filter should be extracted from query
    expect(result.current.filters.status).toEqual(['active']);
  });

  it('should override state filters with query-derived custom filters', async () => {
    // Test that query-derived filters override state filters
    const { result } = await renderHookWithProvider(() => useContentListFilters(), {
      providerOverrides: {
        features: {
          search: {
            initialQuery: 'status:active test',
          },
          filtering: {
            custom: {
              status: {
                name: 'Status',
                options: [
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ],
              },
            },
          },
        },
      },
    });

    // Set a state filter first
    act(() => {
      result.current.setFilters({ status: ['inactive'] });
    });

    // Wait for filters to update
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // Query-derived filter should override state filter
    // The query text 'status:active' should take precedence over the state filter
    expect(result.current.filters.status).toEqual(['active']);
  });
});
