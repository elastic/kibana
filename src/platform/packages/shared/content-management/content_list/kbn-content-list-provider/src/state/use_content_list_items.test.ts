/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useContentListItems } from './use_content_list_items';
import { renderHookWithProvider, createMockItems, createMockFindItems } from '../test_utils';

describe('useContentListItems', () => {
  it('should return empty items when data source returns empty', async () => {
    const emptyFindItems = jest.fn(async () => ({ items: [], total: 0 }));
    const { result } = await renderHookWithProvider(() => useContentListItems(), {
      providerOverrides: {
        dataSource: { findItems: emptyFindItems },
      },
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.totalItems).toBe(0);
  });

  it('should return items after fetch', async () => {
    const mockItems = createMockItems(3);
    const { result } = await renderHookWithProvider(() => useContentListItems(), {
      providerOverrides: {
        dataSource: { findItems: createMockFindItems(mockItems) },
      },
    });

    // Wait for the query to complete and items to be loaded
    await waitFor(() => {
      expect(result.current.items.length).toBe(3);
    });

    expect(result.current.totalItems).toBe(3);
  });

  it('should return loading state', async () => {
    const { result } = await renderHookWithProvider(() => useContentListItems());

    // Initially not loading (after fetch completes)
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('should return error state on fetch failure', async () => {
    const error = new Error('Fetch failed');
    const mockFindItems = jest.fn(async () => {
      throw error;
    });

    const { result } = await renderHookWithProvider(() => useContentListItems(), {
      providerOverrides: {
        dataSource: { findItems: mockFindItems },
      },
    });

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });
  });

  it('should provide refetch function', async () => {
    const { result } = await renderHookWithProvider(() => useContentListItems());

    expect(typeof result.current.refetch).toBe('function');
  });

  it('should trigger new fetch when refetch is called', async () => {
    const mockFindItems = jest.fn(createMockFindItems(createMockItems(2)));
    const { result } = await renderHookWithProvider(() => useContentListItems(), {
      providerOverrides: {
        dataSource: { findItems: mockFindItems },
      },
    });

    expect(mockFindItems).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(mockFindItems).toHaveBeenCalledTimes(2);
    });
  });

  it('should throw error when used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useContentListItems());
    }).toThrow('ContentList hooks must be used within ContentListProvider');

    consoleError.mockRestore();
  });
});
