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
import type { FavoritesClientPublic } from '@kbn/content-management-favorites-public';
import { ContentListProvider } from '../../context';
import type { FindItemsResult, FindItemsParams } from '../../datasource';
import { useContentListFilters } from './use_content_list_filters';
import { useContentListSearch } from '../search/use_content_list_search';

const mockFavoritesClient: FavoritesClientPublic = {
  getFavorites: jest.fn().mockResolvedValue({ favoriteIds: [] }),
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
  isAvailable: jest.fn().mockResolvedValue(true),
  getFavoriteType: jest.fn().mockReturnValue('dashboard'),
  reportAddFavoriteClick: jest.fn(),
  reportRemoveFavoriteClick: jest.fn(),
};

describe('useContentListFilters', () => {
  const mockFindItems = jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items: [],
      total: 0,
    })
  );

  const createWrapper =
    (services?: { favorites?: FavoritesClientPublic }) =>
    ({ children }: { children: React.ReactNode }) =>
      (
        <ContentListProvider
          id="test-list"
          labels={{ entity: 'item', entityPlural: 'items' }}
          dataSource={{ findItems: mockFindItems }}
          services={services}
        >
          {children}
        </ContentListProvider>
      );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns default filters', () => {
      const { result } = renderHook(() => useContentListFilters(), {
        wrapper: createWrapper(),
      });

      // `toFindItemsFilters(EMPTY_MODEL)` produces `{}` (empty object).
      expect(result.current.filters).toEqual({});
    });
  });

  describe('clearFilters', () => {
    it('strips filter clauses from queryText', () => {
      const { result } = renderHook(
        () => ({ filters: useContentListFilters(), search: useContentListSearch() }),
        { wrapper: createWrapper({ favorites: mockFavoritesClient }) }
      );

      act(() => {
        result.current.search.setQueryFromText('is:starred');
      });

      expect(result.current.filters.filters).toEqual({ starred: { state: 'include' } });

      act(() => {
        result.current.filters.clearFilters();
      });

      expect(result.current.filters.filters).toEqual({});
      expect(result.current.search.queryText).toBe('');
    });

    it('preserves free-text search when clearing filters', () => {
      const { result } = renderHook(
        () => ({ filters: useContentListFilters(), search: useContentListSearch() }),
        { wrapper: createWrapper({ favorites: mockFavoritesClient }) }
      );

      act(() => {
        result.current.search.setQueryFromText('is:starred my search');
      });

      expect(result.current.filters.filters).toEqual({
        search: 'my search',
        starred: { state: 'include' },
      });

      act(() => {
        result.current.filters.clearFilters();
      });

      expect(result.current.search.queryText).toBe('my search');
      expect(result.current.filters.filters).toEqual({ search: 'my search' });
    });
  });

  describe('error handling', () => {
    it('throws when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useContentListFilters());
      }).toThrow(
        'ContentListStateContext is missing. Ensure your component is wrapped with ContentListProvider.'
      );

      consoleSpy.mockRestore();
    });
  });
});
