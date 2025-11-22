/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useContentListItems, type ContentListItem } from '@kbn/content-list-provider';
import { useExpandableRows, getRowId } from './use_expandable_rows';

jest.mock('@kbn/content-list-provider', () => ({
  useContentListItems: jest.fn(),
}));

const mockUseContentListItems = useContentListItems as jest.MockedFunction<
  typeof useContentListItems
>;

const mockItems: ContentListItem[] = [
  { id: '1', title: 'Item 1' },
  { id: '2', title: 'Item 2' },
  { id: '3', title: 'Item 3' },
];

const createItemsValue = (
  overrides?: Partial<ReturnType<typeof useContentListItems>>
): ReturnType<typeof useContentListItems> =>
  ({
    items: mockItems,
    totalItems: mockItems.length,
    isLoading: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useContentListItems>);

describe('useExpandableRows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseContentListItems.mockReturnValue(createItemsValue());
  });

  describe('getRowId', () => {
    it('returns the correct row ID format', () => {
      expect(getRowId('item-1')).toBe('content-list-table-item-item-1');
    });
  });

  describe('without renderDetails', () => {
    it('returns empty state when renderDetails is not provided', () => {
      const { result } = renderHook(() => useExpandableRows());

      expect(result.current.itemIdToExpandedRowMap).toBeUndefined();
      expect(result.current.hasAnyExpandableContent).toBe(false);
      expect(result.current.hasExpandableContent(mockItems[0])).toBe(false);
    });
  });

  describe('with renderDetails', () => {
    it('allows all rows to expand when no canExpand predicate is provided', () => {
      const renderDetails = jest.fn(() => 'details');
      const { result } = renderHook(() => useExpandableRows(renderDetails));

      expect(result.current.hasAnyExpandableContent).toBe(true);
      expect(result.current.hasExpandableContent(mockItems[0])).toBe(true);
      expect(result.current.hasExpandableContent(mockItems[1])).toBe(true);
    });

    it('does NOT call renderDetails until a row is expanded (lazy evaluation)', () => {
      const renderDetails = jest.fn(() => 'details');
      renderHook(() => useExpandableRows(renderDetails));

      // renderDetails should NOT be called during initial render
      expect(renderDetails).not.toHaveBeenCalled();
    });

    it('only calls renderDetails for expanded rows', () => {
      const renderDetails = jest.fn((item: ContentListItem) => `details for ${item.id}`);
      const { result } = renderHook(() => useExpandableRows(renderDetails));

      // Expand item 1
      act(() => {
        result.current.toggleRowExpanded(mockItems[0]);
      });

      // Should only call renderDetails for item 1
      expect(renderDetails).toHaveBeenCalledTimes(1);
      expect(renderDetails).toHaveBeenCalledWith(mockItems[0]);
    });

    it('builds itemIdToExpandedRowMap only for expanded items', () => {
      const renderDetails = jest.fn((item: ContentListItem) => `details for ${item.id}`);
      const { result } = renderHook(() => useExpandableRows(renderDetails));

      // Expand item 1
      act(() => {
        result.current.toggleRowExpanded(mockItems[0]);
      });

      expect(result.current.itemIdToExpandedRowMap).toEqual({
        [getRowId('1')]: 'details for 1',
      });

      // Expand item 2 as well
      act(() => {
        result.current.toggleRowExpanded(mockItems[1]);
      });

      expect(result.current.itemIdToExpandedRowMap).toEqual({
        [getRowId('1')]: 'details for 1',
        [getRowId('2')]: 'details for 2',
      });
    });

    it('removes content from map when row is collapsed', () => {
      const renderDetails = jest.fn((item: ContentListItem) => `details for ${item.id}`);
      const { result } = renderHook(() => useExpandableRows(renderDetails));

      // Expand then collapse item 1
      act(() => {
        result.current.toggleRowExpanded(mockItems[0]);
      });
      act(() => {
        result.current.toggleRowExpanded(mockItems[0]);
      });

      expect(result.current.itemIdToExpandedRowMap).toBeUndefined();
      expect(result.current.isRowExpanded(mockItems[0])).toBe(false);
    });
  });

  describe('with canExpand predicate', () => {
    it('uses canExpand to determine which rows can expand', () => {
      const renderDetails = jest.fn(() => 'details');
      // Only item 1 can expand
      const canExpand = jest.fn((item: ContentListItem) => item.id === '1');

      const { result } = renderHook(() => useExpandableRows(renderDetails, canExpand));

      expect(result.current.hasExpandableContent(mockItems[0])).toBe(true);
      expect(result.current.hasExpandableContent(mockItems[1])).toBe(false);
      expect(result.current.hasExpandableContent(mockItems[2])).toBe(false);
    });

    it('uses canExpand to determine hasAnyExpandableContent', () => {
      const renderDetails = jest.fn(() => 'details');
      // No items can expand
      const canExpand = jest.fn(() => false);

      const { result } = renderHook(() => useExpandableRows(renderDetails, canExpand));

      expect(result.current.hasAnyExpandableContent).toBe(false);
    });

    it('does NOT call renderDetails for items that fail canExpand', () => {
      const renderDetails = jest.fn((item: ContentListItem) => `details for ${item.id}`);
      // Only item 1 can expand
      const canExpand = jest.fn((item: ContentListItem) => item.id === '1');

      const { result } = renderHook(() => useExpandableRows(renderDetails, canExpand));

      // Try to expand item 2 (which should fail canExpand)
      act(() => {
        result.current.toggleRowExpanded(mockItems[1]);
      });

      // renderDetails should not be called since item 2 can't expand
      expect(renderDetails).not.toHaveBeenCalled();
      expect(result.current.itemIdToExpandedRowMap).toBeUndefined();
    });

    it('still expands items that pass canExpand', () => {
      const renderDetails = jest.fn((item: ContentListItem) => `details for ${item.id}`);
      const canExpand = jest.fn((item: ContentListItem) => item.id === '1');

      const { result } = renderHook(() => useExpandableRows(renderDetails, canExpand));

      // Expand item 1 (which passes canExpand)
      act(() => {
        result.current.toggleRowExpanded(mockItems[0]);
      });

      expect(renderDetails).toHaveBeenCalledWith(mockItems[0]);
      expect(result.current.itemIdToExpandedRowMap).toEqual({
        [getRowId('1')]: 'details for 1',
      });
    });
  });

  describe('isRowExpanded', () => {
    it('returns true for expanded rows', () => {
      const renderDetails = jest.fn(() => 'details');
      const { result } = renderHook(() => useExpandableRows(renderDetails));

      act(() => {
        result.current.toggleRowExpanded(mockItems[0]);
      });

      expect(result.current.isRowExpanded(mockItems[0])).toBe(true);
      expect(result.current.isRowExpanded(mockItems[1])).toBe(false);
    });
  });

  describe('with filteredItems option', () => {
    it('uses filteredItems instead of provider items', () => {
      const filteredItems: ContentListItem[] = [{ id: 'filtered-1', title: 'Filtered Item' }];
      const renderDetails = jest.fn((item: ContentListItem) => `details for ${item.id}`);

      const { result } = renderHook(() =>
        useExpandableRows(renderDetails, undefined, { filteredItems })
      );

      // Should use filtered items.
      expect(result.current.hasAnyExpandableContent).toBe(true);

      // Expand the filtered item.
      act(() => {
        result.current.toggleRowExpanded(filteredItems[0]);
      });

      expect(renderDetails).toHaveBeenCalledWith(filteredItems[0]);
    });

    it('ignores expanded items not in filteredItems', () => {
      const filteredItems: ContentListItem[] = [{ id: 'filtered-1', title: 'Filtered Item' }];
      const renderDetails = jest.fn((item: ContentListItem) => `details for ${item.id}`);

      const { result } = renderHook(() =>
        useExpandableRows(renderDetails, undefined, { filteredItems })
      );

      // Try to expand an item that's not in filteredItems.
      act(() => {
        result.current.toggleRowExpanded(mockItems[0]);
      });

      // renderDetails should not be called for non-filtered item.
      expect(renderDetails).not.toHaveBeenCalled();
      expect(result.current.itemIdToExpandedRowMap).toBeUndefined();
    });
  });

  describe('loadingItemIds', () => {
    it('returns empty set when no items are loading', () => {
      const renderDetails = jest.fn(() => 'sync content');
      const { result } = renderHook(() => useExpandableRows(renderDetails));

      expect(result.current.loadingItemIds.size).toBe(0);
    });
  });
});
