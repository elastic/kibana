/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useContentListSort } from '@kbn/content-list-provider';
import { useSorting } from './use_sorting';

jest.mock('@kbn/content-list-provider', () => ({
  useContentListSort: jest.fn(),
}));

const mockUseContentListSort = useContentListSort as jest.MockedFunction<typeof useContentListSort>;

const createSortValue = (
  overrides?: Partial<ReturnType<typeof useContentListSort>>
): ReturnType<typeof useContentListSort> =>
  ({
    field: 'updatedAt',
    direction: 'desc' as const,
    setSort: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useContentListSort>);

describe('useSorting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContentListSort.mockReturnValue(createSortValue());
  });

  describe('sorting configuration', () => {
    it('returns sorting config with field and direction from provider', () => {
      mockUseContentListSort.mockReturnValue(createSortValue({ field: 'title', direction: 'asc' }));

      const { result } = renderHook(() => useSorting());

      expect(result.current.sorting).toEqual({
        sort: {
          field: 'title',
          direction: 'asc',
        },
        enableAllColumns: true,
      });
    });

    it('returns default field and direction from provider', () => {
      const { result } = renderHook(() => useSorting());

      expect(result.current.sorting.sort.field).toBe('updatedAt');
      expect(result.current.sorting.sort.direction).toBe('desc');
    });

    it('always enables all columns for sorting', () => {
      const { result } = renderHook(() => useSorting());

      expect(result.current.sorting.enableAllColumns).toBe(true);
    });
  });

  describe('onChange handler', () => {
    it('calls setSort when sort criteria changes', () => {
      const setSort = jest.fn();
      mockUseContentListSort.mockReturnValue(createSortValue({ setSort }));

      const { result } = renderHook(() => useSorting());

      act(() => {
        result.current.onChange({
          sort: {
            field: 'title',
            direction: 'asc',
          },
        });
      });

      expect(setSort).toHaveBeenCalledTimes(1);
      expect(setSort).toHaveBeenCalledWith('title', 'asc');
    });

    it('does not call setSort when sort is undefined in criteria', () => {
      const setSort = jest.fn();
      mockUseContentListSort.mockReturnValue(createSortValue({ setSort }));

      const { result } = renderHook(() => useSorting());

      act(() => {
        result.current.onChange({});
      });

      expect(setSort).not.toHaveBeenCalled();
    });

    it('converts field to string when calling setSort', () => {
      const setSort = jest.fn();
      mockUseContentListSort.mockReturnValue(createSortValue({ setSort }));

      const { result } = renderHook(() => useSorting());

      act(() => {
        result.current.onChange({
          sort: {
            field: 'id' as const,
            direction: 'desc',
          },
        });
      });

      expect(setSort).toHaveBeenCalledWith('id', 'desc');
    });
  });

  describe('memoization', () => {
    it('returns stable sorting reference when values do not change', () => {
      const { result, rerender } = renderHook(() => useSorting());

      const firstSorting = result.current.sorting;
      rerender();
      const secondSorting = result.current.sorting;

      expect(firstSorting).toBe(secondSorting);
    });

    it('returns new sorting reference when field changes', () => {
      const { result, rerender } = renderHook(() => useSorting());

      const firstSorting = result.current.sorting;

      mockUseContentListSort.mockReturnValue(
        createSortValue({ field: 'title', direction: 'desc' })
      );
      rerender();

      const secondSorting = result.current.sorting;

      expect(firstSorting).not.toBe(secondSorting);
      expect(secondSorting.sort.field).toBe('title');
    });

    it('returns new sorting reference when direction changes', () => {
      const { result, rerender } = renderHook(() => useSorting());

      const firstSorting = result.current.sorting;

      mockUseContentListSort.mockReturnValue(
        createSortValue({ field: 'updatedAt', direction: 'asc' })
      );
      rerender();

      const secondSorting = result.current.sorting;

      expect(firstSorting).not.toBe(secondSorting);
      expect(secondSorting.sort.direction).toBe('asc');
    });

    it('returns stable onChange reference', () => {
      const { result, rerender } = renderHook(() => useSorting());

      const firstOnChange = result.current.onChange;
      rerender();
      const secondOnChange = result.current.onChange;

      expect(firstOnChange).toBe(secondOnChange);
    });

    it('returns new onChange reference when setSort changes', () => {
      const { result, rerender } = renderHook(() => useSorting());

      const firstOnChange = result.current.onChange;

      mockUseContentListSort.mockReturnValue(createSortValue({ setSort: jest.fn() }));
      rerender();

      const secondOnChange = result.current.onChange;

      expect(firstOnChange).not.toBe(secondOnChange);
    });
  });

  describe('integration with EuiBasicTable', () => {
    it('provides compatible sorting config for EuiBasicTable', () => {
      mockUseContentListSort.mockReturnValue(createSortValue({ field: 'title', direction: 'asc' }));

      const { result } = renderHook(() => useSorting());

      // Verify the structure matches EuiBasicTable expectations.
      const { sorting, onChange } = result.current;

      expect(sorting).toHaveProperty('sort');
      expect(sorting).toHaveProperty('enableAllColumns');
      expect(sorting.sort).toHaveProperty('field');
      expect(sorting.sort).toHaveProperty('direction');
      expect(typeof onChange).toBe('function');
    });
  });
});
