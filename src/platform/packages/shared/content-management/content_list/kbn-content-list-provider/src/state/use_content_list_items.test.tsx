/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ContentListProvider } from '../context';
import type { ContentListProviderProps } from '../context';
import type { FindItemsResult, FindItemsParams } from '../datasource';
import type { ContentListItem } from '../item';
import { useContentListItems } from './use_content_list_items';
import { useContentListSearch } from '../features/search/use_content_list_search';

const sampleItems: ContentListItem[] = [
  { id: '1', title: 'Dashboard A', description: 'First dashboard' },
  { id: '2', title: 'Dashboard B', description: 'Second dashboard' },
  { id: '3', title: 'Dashboard C', tags: ['tag-1'] },
];

describe('useContentListItems', () => {
  const mockFindItems = jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items: sampleItems,
      total: sampleItems.length,
    })
  );

  const createWrapper = (props?: Partial<ContentListProviderProps>) => {
    const defaultProps: ContentListProviderProps = {
      id: 'test-list',
      labels: { entity: 'item', entityPlural: 'items' },
      dataSource: { findItems: mockFindItems },
      children: null,
      ...props,
    };

    return ({ children }: { children: React.ReactNode }) => (
      <ContentListProvider {...defaultProps}>{children}</ContentListProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('error handling', () => {
    it('throws when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useContentListItems());
      }).toThrow(
        'ContentListStateContext is missing. Ensure your component is wrapped with ContentListProvider.'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('return shape', () => {
    it('returns items, totalItems, isLoading, error, and refetch', () => {
      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('items');
      expect(result.current).toHaveProperty('totalItems');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('data fetching', () => {
    it('calls `findItems` on mount and returns the items', async () => {
      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFindItems).toHaveBeenCalled();
      expect(result.current.items).toEqual(sampleItems);
      expect(result.current.totalItems).toBe(3);
    });

    it('passes default sort params to `findItems`', async () => {
      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFindItems).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: { field: 'title', direction: 'asc' },
        })
      );
    });

    it('passes custom initial sort from features', async () => {
      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({
          features: {
            sorting: { initialSort: { field: 'updatedAt', direction: 'desc' } },
          },
        }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFindItems).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: { field: 'updatedAt', direction: 'desc' },
        })
      );
    });

    it('omits sort when sorting is disabled', async () => {
      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({ features: { sorting: false } }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFindItems).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: undefined,
        })
      );
    });

    it('passes initial search text to `findItems`', async () => {
      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({
          features: { search: { initialSearch: 'hello' } },
        }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFindItems).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery: 'hello',
          filters: expect.objectContaining({ search: 'hello' }),
        })
      );
    });

    it('returns empty items when `findItems` returns no results', async () => {
      const emptyFindItems = jest.fn(async () => ({ items: [] as ContentListItem[], total: 0 }));

      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({
          id: 'empty-list',
          dataSource: { findItems: emptyFindItems },
        }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.totalItems).toBe(0);
    });

    it('provides an error when `findItems` rejects', async () => {
      const failingFindItems = jest.fn(async () => {
        throw new Error('Network failure');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({
          id: 'error-list',
          dataSource: { findItems: failingFindItems },
        }),
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error?.message).toBe('Network failure');

      consoleSpy.mockRestore();
    });

    it('normalizes non-Error rejections into an `Error` instance', async () => {
      const failingFindItems = jest.fn(async () => {
        throw 'string error'; // eslint-disable-line no-throw-literal
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({
          id: 'string-error-list',
          dataSource: { findItems: failingFindItems },
        }),
      });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('string error');

      consoleSpy.mockRestore();
    });
  });

  describe('onFetchSuccess callback', () => {
    it('invokes `onFetchSuccess` after a successful fetch', async () => {
      const onFetchSuccess = jest.fn();

      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({
          dataSource: { findItems: mockFindItems, onFetchSuccess },
        }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(onFetchSuccess).toHaveBeenCalledWith({
        items: sampleItems,
        total: sampleItems.length,
      });
    });

    it('logs a warning if `onFetchSuccess` throws, without breaking the query', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const onFetchSuccess = jest.fn(() => {
        throw new Error('callback error');
      });

      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper({
          dataSource: { findItems: mockFindItems, onFetchSuccess },
        }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The query should still succeed despite the callback error.
      expect(result.current.items).toEqual(sampleItems);
      expect(result.current.error).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ContentListProvider] onFetchSuccess callback error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('filter integration', () => {
    it('re-fetches when tag filters are updated via `setSearch`', async () => {
      const { result } = renderHook(
        () => ({
          items: useContentListItems(),
          search: useContentListSearch(),
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.items.isLoading).toBe(false);
      });

      mockFindItems.mockClear();

      act(() => {
        result.current.search.setSearch('tag:production', {
          search: undefined,
          tag: { include: ['production'] },
        });
      });

      await waitFor(() => {
        expect(mockFindItems).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              tag: { include: ['production'] },
            }),
          })
        );
      });
    });
  });

  describe('search integration', () => {
    it('re-fetches when search is updated via `setSearch`', async () => {
      const { result } = renderHook(
        () => ({
          items: useContentListItems(),
          search: useContentListSearch(),
        }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.items.isLoading).toBe(false);
      });

      mockFindItems.mockClear();

      act(() => {
        result.current.search.setSearch('my query', { search: 'my query' });
      });

      await waitFor(() => {
        expect(mockFindItems).toHaveBeenCalledWith(
          expect.objectContaining({
            searchQuery: 'my query',
          })
        );
      });
    });
  });

  describe('refetch', () => {
    it('can manually trigger a refetch', async () => {
      const { result } = renderHook(() => useContentListItems(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCount = mockFindItems.mock.calls.length;

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(mockFindItems.mock.calls.length).toBeGreaterThan(callCount);
      });
    });
  });
});
