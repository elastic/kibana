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

  describe('public API shape', () => {
    it('exposes queryText, setQueryFromText, setQueryFromEuiQuery, isSupported, and fieldNames', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('queryText');
      expect(result.current).toHaveProperty('setQueryFromText');
      expect(result.current).toHaveProperty('setQueryFromEuiQuery');
      expect(result.current).toHaveProperty('isSupported');
      expect(result.current).toHaveProperty('fieldNames');
    });

    it('does not expose the removed search alias', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper(),
      });

      expect(result.current).not.toHaveProperty('search');
    });

    it('does not expose the removed setSearch alias', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper(),
      });

      expect(result.current).not.toHaveProperty('setSearch');
    });
  });

  describe('initial state', () => {
    it('returns empty queryText by default', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper(),
      });

      expect(result.current.queryText).toBe('');
    });

    it('returns initial search from features config', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper({ initialSearch: 'hello' }),
      });

      expect(result.current.queryText).toBe('hello');
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

  describe('setQueryFromText', () => {
    it('updates the queryText', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setQueryFromText('dashboard');
      });

      expect(result.current.queryText).toBe('dashboard');
    });

    it('clears queryText when set to empty string', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper({ initialSearch: 'initial' }),
      });

      act(() => {
        result.current.setQueryFromText('');
      });

      expect(result.current.queryText).toBe('');
    });

    it('is a no-op when search is disabled', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper({ searchDisabled: true }),
      });

      const initialQueryText = result.current.queryText;

      act(() => {
        result.current.setQueryFromText('should not update');
      });

      expect(result.current.queryText).toBe(initialQueryText);
    });

    it('can be called multiple times', () => {
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setQueryFromText('first');
      });

      act(() => {
        result.current.setQueryFromText('second');
      });

      act(() => {
        result.current.setQueryFromText('third');
      });

      expect(result.current.queryText).toBe('third');
    });

    it('accepts unparseable text (e.g. from URL params) without throwing', () => {
      // setQueryFromText stores raw text without parsing — invalid EUI query
      // syntax must be accepted so URL-param state round-trips work correctly.
      const { result } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper(),
      });

      expect(() => {
        act(() => {
          result.current.setQueryFromText('status:open (unclosed');
        });
      }).not.toThrow();

      expect(result.current.queryText).toBe('status:open (unclosed');
    });
  });

  describe('function stability', () => {
    it('provides stable setQueryFromText reference across renders', () => {
      const { result, rerender } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper(),
      });

      const first = result.current.setQueryFromText;
      rerender();

      expect(result.current.setQueryFromText).toBe(first);
    });

    it('provides stable setQueryFromEuiQuery reference across renders', () => {
      const { result, rerender } = renderHook(() => useContentListSearch(), {
        wrapper: createWrapper(),
      });

      const first = result.current.setQueryFromEuiQuery;
      rerender();

      expect(result.current.setQueryFromEuiQuery).toBe(first);
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
    it('updates queryText in state and resets page index when setQueryFromText is called', () => {
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

      act(() => {
        result.current.searchHook.setQueryFromText('dashboard');
      });

      expect(result.current.stateHook.state.queryText).toBe('dashboard');
      expect(result.current.stateHook.state.page.index).toBe(0);
      expect(result.current.stateHook.state.page.size).toBe(10);
    });
  });
});
