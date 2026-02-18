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
import { ContentListProvider } from '../../context';
import type { FindItemsResult, FindItemsParams } from '../../datasource';
import { useContentListState } from '../../state';
import { useContentListSearch } from './use_content_list_search';

describe('useContentListSearch', () => {
  const mockFindItems = jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items: [],
      total: 0,
    })
  );

  const createWrapper = (options?: {
    initialSearch?: string;
    searchDisabled?: boolean;
    pagination?: { initialPageSize: number };
  }) => {
    const { initialSearch, searchDisabled, pagination } = options ?? {};

    const resolveFeatures = () => {
      const base: Record<string, unknown> = {};

      if (searchDisabled) {
        base.search = false as const;
      } else if (initialSearch) {
        base.search = { initialSearch };
      }

      if (pagination) {
        base.pagination = pagination;
      }

      return Object.keys(base).length > 0 ? base : undefined;
    };

    const features = resolveFeatures();

    return ({ children }: { children: React.ReactNode }) => (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'item', entityPlural: 'items' }}
        dataSource={{ findItems: mockFindItems }}
        features={features}
      >
        {children}
      </ContentListProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns empty search text by default', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper(),
      });

      expect(result.current.search).toBe('');
    });

    it('returns initial search from features config', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper({ initialSearch: 'hello' }),
      });

      expect(result.current.search).toBe('hello');
    });

    it('returns isSupported true by default', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSupported).toBe(true);
    });

    it('returns isSupported false when search is disabled', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper({ searchDisabled: true }),
      });

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('setSearch', () => {
    it('updates the search text', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSearch('dashboard', { search: 'dashboard' });
      });

      expect(result.current.search).toBe('dashboard');
    });

    it('clears search text when set to empty string', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper({ initialSearch: 'initial' }),
      });

      act(() => {
        result.current.setSearch('', { search: undefined });
      });

      expect(result.current.search).toBe('');
    });

    it('is a no-op when search is disabled', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper({ searchDisabled: true }),
      });

      const initialSearch = result.current.search;

      act(() => {
        result.current.setSearch('should not update', { search: 'should not update' });
      });

      // Search should not change when disabled.
      expect(result.current.search).toBe(initialSearch);
    });

    it('can be called multiple times', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSearch('first', { search: 'first' });
      });

      act(() => {
        result.current.setSearch('second', { search: 'second' });
      });

      act(() => {
        result.current.setSearch('third', { search: 'third' });
      });

      expect(result.current.search).toBe('third');
    });
  });

  describe('function stability', () => {
    it('provides stable setSearch reference across renders', () => {
      const { result, rerender } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper(),
      });

      const firstSetSearch = result.current.setSearch;
      rerender();
      const secondSetSearch = result.current.setSearch;

      expect(firstSetSearch).toBe(secondSetSearch);
    });
  });

  describe('error handling', () => {
    it('throws when used outside provider', () => {
      // Suppress console.error for expected error.
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useContentListSearch());
      }).toThrow(
        'ContentListContext is missing. Ensure your component is wrapped with ContentListProvider.'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('state integration', () => {
    it('updates filters and resets page index when setSearch is called', () => {
      const { result } = renderHook(
        () => ({
          searchHook: useContentListSearch(),
          stateHook: useContentListState(),
        }),
        {
          wrapper: createWrapper({ pagination: { initialPageSize: 10 } }),
        }
      );

      // Advance to page 2 first so we can verify the reset.
      act(() => {
        result.current.stateHook.dispatch({
          type: 'SET_PAGE_INDEX',
          payload: { index: 2 },
        });
      });

      expect(result.current.stateHook.state.page.index).toBe(2);

      // Calling `setSearch` should update filters and reset page index to 0.
      act(() => {
        result.current.searchHook.setSearch('dashboard', { search: 'dashboard' });
      });

      expect(result.current.stateHook.state.filters).toEqual({ search: 'dashboard' });
      expect(result.current.stateHook.state.page.index).toBe(0);
      expect(result.current.stateHook.state.page.size).toBe(10);
    });
  });
});
