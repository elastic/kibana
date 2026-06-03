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
import { useContentListSort } from './use_content_list_sort';

describe('useContentListSort', () => {
  const mockFindItems = jest.fn(
    async (_params: FindItemsParams): Promise<FindItemsResult> => ({
      items: [],
      total: 0,
    })
  );

  const createWrapper = (options?: {
    initialSort?: { field: string; direction: 'asc' | 'desc' };
    sortingDisabled?: boolean;
  }) => {
    const { initialSort, sortingDisabled } = options ?? {};
    const features = sortingDisabled
      ? { sorting: false as const }
      : initialSort
      ? { sorting: { initialSort } }
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
  });

  describe('initial state', () => {
    it('returns default sort (title ascending) when no initial sort specified', () => {
      const { result } = renderHook(() => useContentListSort(), {
        wrapper: createWrapper(),
      });

      expect(result.current.field).toBe('title');
      expect(result.current.direction).toBe('asc');
    });

    it('returns initial sort from features config', () => {
      const { result } = renderHook(() => useContentListSort(), {
        wrapper: createWrapper({ initialSort: { field: 'updatedAt', direction: 'desc' } }),
      });

      expect(result.current.field).toBe('updatedAt');
      expect(result.current.direction).toBe('desc');
    });

    it('returns isSupported true by default', () => {
      const { result } = renderHook(() => useContentListSort(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSupported).toBe(true);
    });

    it('returns isSupported false when sorting is disabled', () => {
      const { result } = renderHook(() => useContentListSort(), {
        wrapper: createWrapper({ sortingDisabled: true }),
      });

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('setSort', () => {
    it('updates field and direction', () => {
      const { result } = renderHook(() => useContentListSort(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSort('name', 'desc');
      });

      expect(result.current.field).toBe('name');
      expect(result.current.direction).toBe('desc');
    });

    it('updates only field when direction stays the same', () => {
      const { result } = renderHook(() => useContentListSort(), {
        wrapper: createWrapper({ initialSort: { field: 'title', direction: 'asc' } }),
      });

      act(() => {
        result.current.setSort('updatedAt', 'asc');
      });

      expect(result.current.field).toBe('updatedAt');
      expect(result.current.direction).toBe('asc');
    });

    it('updates only direction when field stays the same', () => {
      const { result } = renderHook(() => useContentListSort(), {
        wrapper: createWrapper({ initialSort: { field: 'title', direction: 'asc' } }),
      });

      act(() => {
        result.current.setSort('title', 'desc');
      });

      expect(result.current.field).toBe('title');
      expect(result.current.direction).toBe('desc');
    });

    it('is a no-op when sorting is disabled', () => {
      const { result } = renderHook(() => useContentListSort(), {
        wrapper: createWrapper({ sortingDisabled: true }),
      });

      const initialField = result.current.field;
      const initialDirection = result.current.direction;

      act(() => {
        result.current.setSort('updatedAt', 'desc');
      });

      // Sort should not change when disabled.
      expect(result.current.field).toBe(initialField);
      expect(result.current.direction).toBe(initialDirection);
    });

    it('can be called multiple times', () => {
      const { result } = renderHook(() => useContentListSort(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSort('name', 'desc');
      });

      act(() => {
        result.current.setSort('updatedAt', 'asc');
      });

      act(() => {
        result.current.setSort('createdAt', 'desc');
      });

      expect(result.current.field).toBe('createdAt');
      expect(result.current.direction).toBe('desc');
    });
  });

  describe('function stability', () => {
    it('provides stable setSort reference across renders', () => {
      const { result, rerender } = renderHook(() => useContentListSort(), {
        wrapper: createWrapper(),
      });

      const firstSetSort = result.current.setSort;
      rerender();
      const secondSetSort = result.current.setSort;

      expect(firstSetSort).toBe(secondSetSort);
    });
  });

  describe('error handling', () => {
    it('throws when used outside provider', () => {
      // Suppress console.error for expected error.
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useContentListSort());
      }).toThrow(
        'ContentListContext is missing. Ensure your component is wrapped with ContentListProvider.'
      );

      consoleSpy.mockRestore();
    });
  });
});
