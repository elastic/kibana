/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useContentListPagination } from './use_content_list_pagination';
import { useContentListItems } from '../../state/use_content_list_items';
import { renderHookWithProvider, createMockItems, createMockFindItems } from '../../test_utils';

describe('useContentListPagination', () => {
  it('should return default pagination (page 0, size 20)', async () => {
    const { result } = await renderHookWithProvider(() => useContentListPagination());

    expect(result.current.index).toBe(0);
    expect(result.current.size).toBe(20);
  });

  it('should return initial page size from config', async () => {
    const { result } = await renderHookWithProvider(() => useContentListPagination(), {
      providerOverrides: {
        features: { pagination: { initialPageSize: 50 } },
      },
    });

    expect(result.current.index).toBe(0);
    expect(result.current.size).toBe(50);
  });

  it('should update pagination when setPage is called', async () => {
    const { result } = await renderHookWithProvider(() => useContentListPagination());

    act(() => {
      result.current.setPage(2, 50);
    });

    expect(result.current.index).toBe(2);
    expect(result.current.size).toBe(50);
  });

  it('should calculate totalPages correctly', async () => {
    const mockItems = createMockItems(95); // 95 items
    const { result } = await renderHookWithProvider(
      () => ({
        pagination: useContentListPagination(),
        items: useContentListItems(),
      }),
      {
        providerOverrides: {
          dataSource: { findItems: createMockFindItems(mockItems) },
          features: { pagination: { initialPageSize: 20 } },
        },
      }
    );

    // Wait for items to be loaded so totalItems is populated
    await waitFor(() => {
      expect(result.current.items.totalItems).toBe(95);
    });

    // 95 items / 20 per page = 4.75 -> 5 pages
    expect(result.current.pagination.totalPages).toBe(5);
  });

  it('should calculate totalPages for exact division', async () => {
    const mockItems = createMockItems(100); // 100 items
    const { result } = await renderHookWithProvider(
      () => ({
        pagination: useContentListPagination(),
        items: useContentListItems(),
      }),
      {
        providerOverrides: {
          dataSource: { findItems: createMockFindItems(mockItems) },
          features: { pagination: { initialPageSize: 20 } },
        },
      }
    );

    // Wait for items to be loaded so totalItems is populated
    await waitFor(() => {
      expect(result.current.items.totalItems).toBe(100);
    });

    // 100 items / 20 per page = 5 pages
    expect(result.current.pagination.totalPages).toBe(5);
  });

  it('should calculate totalPages with custom page size', async () => {
    const mockItems = createMockItems(60);
    const { result } = await renderHookWithProvider(
      () => ({
        pagination: useContentListPagination(),
        items: useContentListItems(),
      }),
      {
        providerOverrides: {
          dataSource: { findItems: createMockFindItems(mockItems) },
          features: { pagination: { initialPageSize: 10 } },
        },
      }
    );

    // Wait for items to be loaded so totalItems is populated
    await waitFor(() => {
      expect(result.current.items.totalItems).toBe(60);
    });

    // 60 items / 10 per page = 6 pages
    expect(result.current.pagination.totalPages).toBe(6);
  });

  it('should recalculate totalPages when page size changes', async () => {
    const mockItems = createMockItems(100);
    const { result } = await renderHookWithProvider(
      () => ({
        pagination: useContentListPagination(),
        items: useContentListItems(),
      }),
      {
        providerOverrides: {
          dataSource: { findItems: createMockFindItems(mockItems) },
          features: { pagination: { initialPageSize: 20 } },
        },
      }
    );

    // Wait for items to be loaded
    await waitFor(() => {
      expect(result.current.items.totalItems).toBe(100);
    });

    expect(result.current.pagination.totalPages).toBe(5);

    act(() => {
      result.current.pagination.setPage(0, 50);
    });

    // After changing page size, totalPages should recalculate
    // Note: totalItems stays 100, so 100 / 50 = 2 pages
    await waitFor(() => {
      expect(result.current.pagination.totalPages).toBe(2);
    });
  });

  it('should provide setPage function', async () => {
    const { result } = await renderHookWithProvider(() => useContentListPagination());

    expect(typeof result.current.setPage).toBe('function');
  });

  it('should memoize callback', async () => {
    const { result, rerender } = await renderHookWithProvider(() => useContentListPagination());

    const firstSetPage = result.current.setPage;

    rerender();

    expect(result.current.setPage).toBe(firstSetPage);
  });

  it('should memoize totalPages calculation', async () => {
    const mockItems = createMockItems(50);
    const { result, rerender } = await renderHookWithProvider(
      () => ({
        pagination: useContentListPagination(),
        items: useContentListItems(),
      }),
      {
        providerOverrides: {
          dataSource: { findItems: createMockFindItems(mockItems) },
        },
      }
    );

    // Wait for items to be loaded
    await waitFor(() => {
      expect(result.current.items.totalItems).toBe(50);
    });

    // 50 / 20 = 2.5 -> 3
    expect(result.current.pagination.totalPages).toBe(3);

    const firstTotalPages = result.current.pagination.totalPages;

    rerender();

    expect(result.current.pagination.totalPages).toBe(firstTotalPages);
  });

  it('should throw error when used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useContentListPagination());
    }).toThrow('ContentList hooks must be used within ContentListProvider');

    consoleError.mockRestore();
  });
});
