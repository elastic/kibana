/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useContentListSort } from './use_content_list_sort';
import { renderHookWithProvider } from '../../test_utils';

describe('useContentListSort', () => {
  it('should return default sort (title ascending)', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSort());

    expect(result.current.field).toBe('title');
    expect(result.current.direction).toBe('asc');
  });

  it('should return initial sort from config', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSort(), {
      providerOverrides: {
        features: {
          sorting: {
            initialSort: { field: 'updatedAt', direction: 'desc' },
          },
        },
      },
    });

    expect(result.current.field).toBe('updatedAt');
    expect(result.current.direction).toBe('desc');
  });

  it('should update sort when setSort is called', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSort());

    act(() => {
      result.current.setSort('updatedAt', 'desc');
    });

    expect(result.current.field).toBe('updatedAt');
    expect(result.current.direction).toBe('desc');
  });

  it('should handle ascending sort direction', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSort());

    act(() => {
      result.current.setSort('createdAt', 'asc');
    });

    expect(result.current.field).toBe('createdAt');
    expect(result.current.direction).toBe('asc');
  });

  it('should handle descending sort direction', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSort());

    act(() => {
      result.current.setSort('title', 'desc');
    });

    expect(result.current.field).toBe('title');
    expect(result.current.direction).toBe('desc');
  });

  it('should provide setSort function', async () => {
    const { result } = await renderHookWithProvider(() => useContentListSort());

    expect(typeof result.current.setSort).toBe('function');
  });

  it('should memoize callback', async () => {
    const { result, rerender } = await renderHookWithProvider(() => useContentListSort());

    const firstSetSort = result.current.setSort;

    rerender();

    expect(result.current.setSort).toBe(firstSetSort);
  });

  it('should throw error when used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useContentListSort());
    }).toThrow('ContentList hooks must be used within ContentListProvider');

    consoleError.mockRestore();
  });
});
