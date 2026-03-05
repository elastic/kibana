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
import { useContentListFilters } from './use_content_list_filters';
import { useContentListSearch } from '../search/use_content_list_search';

describe('useContentListFilters', () => {
  const mockFindItems = jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items: [],
      total: 0,
    })
  );

  const createWrapper =
    () =>
    ({ children }: { children: React.ReactNode }) =>
      (
        <ContentListProvider
          id="test-list"
          labels={{ entity: 'item', entityPlural: 'items' }}
          dataSource={{ findItems: mockFindItems }}
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

      expect(result.current.filters).toEqual({
        search: undefined,
      });
    });
  });

  describe('clearFilters', () => {
    it('resets filters to defaults', () => {
      const { result } = renderHook(
        () => ({ filters: useContentListFilters(), search: useContentListSearch() }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.search.setSearch('query', {
          search: 'query',
          tag: { include: ['tag-1'] },
        });
      });

      act(() => {
        result.current.filters.clearFilters();
      });

      expect(result.current.filters.filters).toEqual({
        search: undefined,
      });
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
