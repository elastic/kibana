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
import {
  ContentListProvider,
  type FindItemsResult,
  type FindItemsParams,
} from '@kbn/content-list-provider';
import { useSorting } from './use_sorting';

const mockFindItems = jest.fn(
  async (_params: FindItemsParams): Promise<FindItemsResult> => ({
    items: [],
    total: 0,
  })
);

const createWrapper =
  (options?: {
    initialSort?: { field: string; direction: 'asc' | 'desc' };
    supportsSorting?: boolean;
  }) =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <ContentListProvider
        id="test-list"
        labels={{ entity: 'item', entityPlural: 'items' }}
        dataSource={{ findItems: mockFindItems }}
        features={
          options?.supportsSorting === false
            ? { sorting: false }
            : options?.initialSort
            ? { sorting: { initialSort: options.initialSort } }
            : undefined
        }
      >
        {children}
      </ContentListProvider>
    );

describe('useSorting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sorting config', () => {
    it('returns sorting configuration compatible with `EuiBasicTable`', () => {
      const { result } = renderHook(() => useSorting(), {
        wrapper: createWrapper(),
      });

      expect(result.current.sorting).toEqual({
        sort: {
          field: 'title',
          direction: 'asc',
        },
      });
    });

    it('reflects the initial sort from provider features', () => {
      const { result } = renderHook(() => useSorting(), {
        wrapper: createWrapper({ initialSort: { field: 'updatedAt', direction: 'desc' } }),
      });

      expect(result.current.sorting?.sort).toEqual({
        field: 'updatedAt',
        direction: 'desc',
      });
    });

    it('does not include `enableAllColumns` (respects per-column `sortable`)', () => {
      const { result } = renderHook(() => useSorting(), {
        wrapper: createWrapper(),
      });

      expect(result.current.sorting).not.toHaveProperty('enableAllColumns');
    });

    it('returns undefined sorting configuration when sorting is unsupported', () => {
      const { result } = renderHook(() => useSorting(), {
        wrapper: createWrapper({ supportsSorting: false }),
      });

      expect(result.current.sorting).toBeUndefined();
    });
  });

  describe('onChange', () => {
    it('updates sort when called with new criteria', () => {
      const { result } = renderHook(() => useSorting(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.onChange({
          sort: { field: 'updatedAt', direction: 'desc' },
        });
      });

      expect(result.current.sorting?.sort).toEqual({
        field: 'updatedAt',
        direction: 'desc',
      });
    });

    it('does not update when criteria has no sort', () => {
      const { result } = renderHook(() => useSorting(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.onChange({});
      });

      // Should remain at default.
      expect(result.current.sorting?.sort).toEqual({
        field: 'title',
        direction: 'asc',
      });
    });

    it('does not update sort when sorting is unsupported', () => {
      const { result } = renderHook(() => useSorting(), {
        wrapper: createWrapper({ supportsSorting: false }),
      });

      act(() => {
        result.current.onChange({
          sort: { field: 'updatedAt', direction: 'desc' },
        });
      });

      expect(result.current.sorting).toBeUndefined();
    });

    it('provides a stable `onChange` reference', () => {
      const { result, rerender } = renderHook(() => useSorting(), {
        wrapper: createWrapper(),
      });

      const firstOnChange = result.current.onChange;
      rerender();
      const secondOnChange = result.current.onChange;

      expect(firstOnChange).toBe(secondOnChange);
    });
  });
});
