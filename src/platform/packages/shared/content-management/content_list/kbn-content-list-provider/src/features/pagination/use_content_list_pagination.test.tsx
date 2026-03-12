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
import { useContentListPagination } from './use_content_list_pagination';
import { DEFAULT_PAGE_SIZE, DEFAULT_PAGE_SIZE_OPTIONS } from './types';

describe('useContentListPagination', () => {
  const mockFindItems = jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items: Array.from({ length: 5 }, (_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`,
        type: 'dashboard',
      })),
      total: 55,
    })
  );

  const createWrapper = (options?: {
    paginationDisabled?: boolean;
    initialPageSize?: number;
    pageSizeOptions?: number[];
  }) => {
    const { paginationDisabled, initialPageSize, pageSizeOptions } = options ?? {};
    const features = paginationDisabled
      ? { pagination: false as const }
      : initialPageSize || pageSizeOptions
      ? { pagination: { initialPageSize, pageSizeOptions } }
      : undefined;

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
    localStorage.clear();
  });

  describe('initial state', () => {
    it('returns default pagination values', () => {
      const { result } = renderHook(() => useContentListPagination(), {
        wrapper: createWrapper(),
      });

      expect(result.current.pageIndex).toBe(0);
      expect(result.current.pageSize).toBe(DEFAULT_PAGE_SIZE);
      expect(result.current.pageSizeOptions).toEqual(DEFAULT_PAGE_SIZE_OPTIONS);
      expect(result.current.isSupported).toBe(true);
    });

    it('returns custom initial page size from config', () => {
      const { result } = renderHook(() => useContentListPagination(), {
        wrapper: createWrapper({ initialPageSize: 50 }),
      });

      expect(result.current.pageSize).toBe(50);
    });

    it('prefers persisted page size over config initialPageSize', () => {
      localStorage.setItem('contentList:pageSize:test-list-listing', '10');

      const { result } = renderHook(() => useContentListPagination(), {
        wrapper: createWrapper({ initialPageSize: 50 }),
      });

      expect(result.current.pageSize).toBe(10);
    });

    it('falls back to config initialPageSize when no persisted value exists', () => {
      // No persisted value in localStorage.
      const { result } = renderHook(() => useContentListPagination(), {
        wrapper: createWrapper({ initialPageSize: 50 }),
      });

      expect(result.current.pageSize).toBe(50);
    });

    it('returns custom page size options from config', () => {
      const customOptions = [25, 50, 100];
      const { result } = renderHook(() => useContentListPagination(), {
        wrapper: createWrapper({ pageSizeOptions: customOptions }),
      });

      expect(result.current.pageSizeOptions).toEqual(customOptions);
    });

    it('returns isSupported false when pagination is disabled', () => {
      const { result } = renderHook(() => useContentListPagination(), {
        wrapper: createWrapper({ paginationDisabled: true }),
      });

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('setPageIndex', () => {
    it('updates page index', () => {
      const { result } = renderHook(() => useContentListPagination(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setPageIndex(2);
      });

      expect(result.current.pageIndex).toBe(2);
    });

    it('is a no-op when pagination is disabled', () => {
      const { result } = renderHook(() => useContentListPagination(), {
        wrapper: createWrapper({ paginationDisabled: true }),
      });

      act(() => {
        result.current.setPageIndex(5);
      });

      expect(result.current.pageIndex).toBe(0);
    });
  });

  describe('setPageSize', () => {
    it('updates page size and resets to page 0', () => {
      const { result } = renderHook(() => useContentListPagination(), {
        wrapper: createWrapper(),
      });

      // First navigate to page 2.
      act(() => {
        result.current.setPageIndex(2);
      });

      expect(result.current.pageIndex).toBe(2);

      // Change page size -- should reset to page 0.
      act(() => {
        result.current.setPageSize(50);
      });

      expect(result.current.pageSize).toBe(50);
      expect(result.current.pageIndex).toBe(0);
    });

    it('persists page size to localStorage', () => {
      const { result } = renderHook(() => useContentListPagination(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setPageSize(50);
      });

      expect(localStorage.getItem('contentList:pageSize:test-list-listing')).toBe('50');
    });

    it('is a no-op when pagination is disabled', () => {
      const { result } = renderHook(() => useContentListPagination(), {
        wrapper: createWrapper({ paginationDisabled: true }),
      });

      act(() => {
        result.current.setPageSize(50);
      });

      expect(result.current.pageSize).toBe(DEFAULT_PAGE_SIZE);
    });
  });

  describe('pageCount', () => {
    it('computes page count from totalItems and pageSize', async () => {
      const { result } = renderHook(() => useContentListPagination(), {
        wrapper: createWrapper(),
      });

      // Wait for query to resolve (totalItems = 55, pageSize = 20).
      await act(async () => {});

      expect(result.current.totalItems).toBe(55);
      expect(result.current.pageCount).toBe(3); // ceil(55 / 20) = 3.
    });
  });

  describe('error handling', () => {
    it('throws when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useContentListPagination());
      }).toThrow(
        'ContentListContext is missing. Ensure your component is wrapped with ContentListProvider.'
      );

      consoleSpy.mockRestore();
    });
  });
});
