/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, render } from '@testing-library/react';
import type { Row } from '@tanstack/react-table';
import { defaultRangeExtractor, type Range, type VirtualItem } from '@tanstack/react-virtual';
import type { GroupNode } from '../../../store_provider';
import {
  useCascadeVirtualizer,
  useCascadeVirtualizerRangeExtractor,
  useAnchorVirtualizerToItemIndex,
  VirtualizedCascadeRowList,
  type UseVirtualizerReturnType,
} from '.';

const rowsToRender = (rowCount: number): Row<GroupNode>[] => {
  return Array.from(
    { length: rowCount },
    (_, index) =>
      new Proxy(
        {
          id: `row-${index}`,
          index,
          depth: 0,
          getIsExpanded: () => false,
          getParentRows: () => [] as Row<GroupNode>[],
          subRows: [] as Row<GroupNode>[],
        } as Row<GroupNode>,
        {
          // escape hatch so we don't have to mock every property on the Row object
          get(target, prop) {
            return Reflect.get(target, prop);
          },
        }
      )
  );
};

describe('virtualizer', () => {
  describe('useCascadeVirtualizer', () => {
    it('should render correctly', () => {
      const { result } = renderHook(() =>
        useCascadeVirtualizer({
          rows: rowsToRender(100),
          overscan: 5,
          enableStickyGroupHeader: false,
          getScrollElement: () => document.body,
        })
      );

      expect(result.current).toHaveProperty('getVirtualItems');
      expect(result.current).toHaveProperty('getTotalSize');
      expect(result.current).toHaveProperty('range');
      expect(result.current).toHaveProperty('virtualizedRowsSizeCache');
      expect(result.current).toHaveProperty('virtualizedRowComputedTranslateValue');
      expect(result.current).toHaveProperty('scrollToVirtualizedIndex');
      expect(result.current).toHaveProperty('scrollToLastVirtualizedRow');
      expect(result.current).toHaveProperty('scrollOffset');
      expect(result.current).toHaveProperty('measureElement');
      expect(result.current).toHaveProperty('preventRowSizeChangePropagation');
    });
  });

  describe('useCascadeVirtualizerRangeExtractor', () => {
    it('should return the default virtualizer range when the prop `enableStickyGroupHeader` is false', () => {
      const { result } = renderHook(() =>
        useCascadeVirtualizerRangeExtractor({
          rows: rowsToRender(100),
          enableStickyGroupHeader: false,
        })
      );

      const range: Range = {
        startIndex: 10,
        endIndex: 20,
        overscan: 5,
        count: 10,
      };

      expect(result.current(range)).toEqual(defaultRangeExtractor(range));
    });

    it('will mark a row with depth 0 as sticky when the prop `enableStickyGroupHeader` is true and the row is expanded', () => {
      const rows = rowsToRender(100);

      const expandedRowIndex = 0;

      // mock the group row with depth 0 as expanded
      jest.spyOn(rows[expandedRowIndex], 'getIsExpanded').mockReturnValue(true);

      const { result } = renderHook(() =>
        useCascadeVirtualizerRangeExtractor({
          rows,
          enableStickyGroupHeader: true,
        })
      );

      const range: Range = {
        // have range start at the expanded row index, so it gets picked as the active sticky index
        startIndex: expandedRowIndex,
        endIndex: 20,
        overscan: 5,
        count: 10,
      };

      expect(result.current(range)).toEqual(defaultRangeExtractor(range));
    });

    it('when the range passed starts with a child row, the index for its parent row is included in the returned range value', () => {
      const rows = rowsToRender(100);

      const parentRowIndex = 5;
      const childRowIndex = 10;

      // mock the child row to have a parent row
      jest
        .spyOn(rows[childRowIndex], 'getParentRows')
        .mockReturnValue([rows[parentRowIndex]] as Row<GroupNode>[]);

      const range: Range = {
        startIndex: childRowIndex,
        endIndex: 20,
        overscan: 5,
        count: 15,
      };

      const { result } = renderHook(() =>
        useCascadeVirtualizerRangeExtractor({
          rows,
          enableStickyGroupHeader: true,
        })
      );

      expect(result.current(range)).toEqual(expect.arrayContaining([parentRowIndex]));
    });

    describe('preventRowSizeChangePropagation', () => {
      it('should return a cleanup function when registering a row', () => {
        const { result } = renderHook(() =>
          useCascadeVirtualizer({
            rows: rowsToRender(100),
            overscan: 5,
            enableStickyGroupHeader: false,
            getScrollElement: () => document.body,
          })
        );

        const cleanup = result.current.preventRowSizeChangePropagation(5);

        expect(typeof cleanup).toBe('function');
      });

      it('should return a stable callback reference across renders', () => {
        const { result, rerender } = renderHook(() =>
          useCascadeVirtualizer({
            rows: rowsToRender(100),
            overscan: 5,
            enableStickyGroupHeader: false,
            getScrollElement: () => document.body,
          })
        );

        const initialCallback = result.current.preventRowSizeChangePropagation;

        rerender();

        expect(result.current.preventRowSizeChangePropagation).toBe(initialCallback);
      });

      it('should allow registering multiple rows independently', () => {
        const { result } = renderHook(() =>
          useCascadeVirtualizer({
            rows: rowsToRender(100),
            overscan: 5,
            enableStickyGroupHeader: false,
            getScrollElement: () => document.body,
          })
        );

        const cleanup1 = result.current.preventRowSizeChangePropagation(1);
        const cleanup2 = result.current.preventRowSizeChangePropagation(2);
        const cleanup3 = result.current.preventRowSizeChangePropagation(3);

        // All cleanups should be functions
        expect(typeof cleanup1).toBe('function');
        expect(typeof cleanup2).toBe('function');
        expect(typeof cleanup3).toBe('function');

        // Cleanup one row should not affect others
        cleanup2();

        // The remaining rows should still be registered (cleanup functions still valid)
        expect(typeof cleanup1).toBe('function');
        expect(typeof cleanup3).toBe('function');
      });
    });
  });

  describe('useAnchorVirtualizerToItemIndex', () => {
    const createMockVirtualizer = (
      overrides: Partial<{
        scrollOffset: number;
        scrollMargin: number;
        paddingStart: number;
        measurementsCache: VirtualItem[];
      }> = {}
    ) => {
      const {
        scrollOffset = 0,
        scrollMargin = 0,
        paddingStart = 0,
        measurementsCache = [],
      } = overrides;

      return {
        scrollOffset,
        options: {
          scrollMargin,
          paddingStart,
          scrollToFn: jest.fn(),
        },
        measurementsCache,
        calculateRange: jest.fn(),
      } as unknown as UseVirtualizerReturnType;
    };

    const buildMeasurementsCache = (sizes: number[], paddingStart = 0): VirtualItem[] => {
      let offset = paddingStart;
      return sizes.map((size, index) => {
        const item = {
          index,
          key: index,
          start: offset,
          end: offset + size,
          size,
          lane: 0,
        };
        offset += size;
        return item;
      });
    };

    it('should not scroll when itemIndex is 0', () => {
      const virtualizer = createMockVirtualizer();

      renderHook(() => useAnchorVirtualizerToItemIndex(virtualizer, 0));

      expect(virtualizer.options.scrollToFn).not.toHaveBeenCalled();
      expect(virtualizer.calculateRange).not.toHaveBeenCalled();
    });

    it('should not scroll when the provided ref is already true', () => {
      const virtualizer = createMockVirtualizer({
        measurementsCache: buildMeasurementsCache([60, 60, 60]),
      });
      const ref = { current: true } as React.MutableRefObject<boolean>;

      renderHook(() => useAnchorVirtualizerToItemIndex(virtualizer, 2, ref));

      expect(virtualizer.options.scrollToFn).not.toHaveBeenCalled();
    });

    it('should not scroll when measurementsCache has no entry for the target index', () => {
      const virtualizer = createMockVirtualizer({
        scrollOffset: 500,
        scrollMargin: 200,
        measurementsCache: buildMeasurementsCache([60]),
      });

      renderHook(() => useAnchorVirtualizerToItemIndex(virtualizer, 5));

      expect(virtualizer.options.scrollToFn).not.toHaveBeenCalled();
    });

    it('should call calculateRange before reading measurementsCache', () => {
      const virtualizer = createMockVirtualizer({
        scrollOffset: 500,
        scrollMargin: 200,
        measurementsCache: buildMeasurementsCache([60, 60, 60, 60, 60]),
      });

      renderHook(() => useAnchorVirtualizerToItemIndex(virtualizer, 3));

      expect(virtualizer.calculateRange).toHaveBeenCalledTimes(1);
    });

    it('should compute the correct scroll adjustment for a nested virtualizer', () => {
      const scrollMargin = 500;
      const scrollOffset = 800;
      const itemSizes = [75, 75, 75, 75, 75, 75];
      const targetIndex = 5;

      const measurementsCache = buildMeasurementsCache(itemSizes);
      const virtualizer = createMockVirtualizer({
        scrollMargin,
        scrollOffset,
        measurementsCache,
      });

      renderHook(() => useAnchorVirtualizerToItemIndex(virtualizer, targetIndex));

      const expectedTargetOffset = scrollMargin + measurementsCache[targetIndex].start;
      const expectedAdjustment = expectedTargetOffset - scrollOffset;

      expect(virtualizer.options.scrollToFn).toHaveBeenCalledWith(
        scrollOffset,
        { behavior: undefined, adjustments: expectedAdjustment },
        virtualizer
      );
      expect(virtualizer.scrollOffset).toBe(expectedTargetOffset);
    });

    it('should scroll forward when the target item is ahead of the current offset', () => {
      const scrollMargin = 200;
      const scrollOffset = 200;
      const measurementsCache = buildMeasurementsCache([60, 60, 60, 60, 60]);
      const targetIndex = 4;

      const virtualizer = createMockVirtualizer({
        scrollMargin,
        scrollOffset,
        measurementsCache,
      });

      renderHook(() => useAnchorVirtualizerToItemIndex(virtualizer, targetIndex));

      const expectedTarget = scrollMargin + measurementsCache[targetIndex].start;

      expect(expectedTarget).toBeGreaterThan(scrollOffset);
      expect(virtualizer.options.scrollToFn).toHaveBeenCalledWith(
        scrollOffset,
        expect.objectContaining({ adjustments: expectedTarget - scrollOffset }),
        virtualizer
      );
    });

    it('should scroll backward when the target item is behind the current offset', () => {
      const scrollMargin = 200;
      const scrollOffset = 1500;
      const measurementsCache = buildMeasurementsCache([60, 60, 60]);
      const targetIndex = 1;

      const virtualizer = createMockVirtualizer({
        scrollMargin,
        scrollOffset,
        measurementsCache,
      });

      renderHook(() => useAnchorVirtualizerToItemIndex(virtualizer, targetIndex));

      const expectedTarget = scrollMargin + measurementsCache[targetIndex].start;

      expect(expectedTarget).toBeLessThan(scrollOffset);
      expect(virtualizer.options.scrollToFn).toHaveBeenCalledWith(
        scrollOffset,
        expect.objectContaining({ adjustments: expectedTarget - scrollOffset }),
        virtualizer
      );
    });

    it('should set the resolved ref to true after anchoring', () => {
      const ref = { current: false } as React.MutableRefObject<boolean>;
      const virtualizer = createMockVirtualizer({
        scrollMargin: 100,
        scrollOffset: 100,
        measurementsCache: buildMeasurementsCache([60, 60, 60]),
      });

      renderHook(() => useAnchorVirtualizerToItemIndex(virtualizer, 2, ref));

      expect(ref.current).toBe(true);
    });

    it('should use an internal ref when no external ref is provided', () => {
      const virtualizer = createMockVirtualizer({
        scrollMargin: 100,
        scrollOffset: 100,
        measurementsCache: buildMeasurementsCache([60, 60, 60]),
      });

      const { rerender } = renderHook(() => useAnchorVirtualizerToItemIndex(virtualizer, 2));

      expect(virtualizer.options.scrollToFn).toHaveBeenCalledTimes(1);

      (virtualizer.options.scrollToFn as jest.Mock).mockClear();
      rerender();

      expect(virtualizer.options.scrollToFn).not.toHaveBeenCalled();
    });

    it('should not re-anchor on subsequent renders', () => {
      const ref = { current: false } as React.MutableRefObject<boolean>;
      const virtualizer = createMockVirtualizer({
        scrollMargin: 100,
        scrollOffset: 100,
        measurementsCache: buildMeasurementsCache([60, 60, 60]),
      });

      const { rerender } = renderHook(() => useAnchorVirtualizerToItemIndex(virtualizer, 2, ref));

      expect(virtualizer.options.scrollToFn).toHaveBeenCalledTimes(1);
      expect(ref.current).toBe(true);

      (virtualizer.options.scrollToFn as jest.Mock).mockClear();
      rerender();

      expect(virtualizer.options.scrollToFn).not.toHaveBeenCalled();
    });

    it('should produce zero adjustment when the target is already at the current scroll position', () => {
      const scrollMargin = 300;
      const measurementsCache = buildMeasurementsCache([80, 80, 80]);
      const targetIndex = 2;
      const scrollOffset = scrollMargin + measurementsCache[targetIndex].start;

      const virtualizer = createMockVirtualizer({
        scrollMargin,
        scrollOffset,
        measurementsCache,
      });

      renderHook(() => useAnchorVirtualizerToItemIndex(virtualizer, targetIndex));

      expect(virtualizer.options.scrollToFn).toHaveBeenCalledWith(
        scrollOffset,
        { behavior: undefined, adjustments: 0 },
        virtualizer
      );
      expect(virtualizer.scrollOffset).toBe(scrollOffset);
    });

    it('should handle variable row heights correctly', () => {
      const scrollMargin = 400;
      const scrollOffset = 600;
      const measurementsCache = buildMeasurementsCache([30, 100, 50, 80, 120]);
      const targetIndex = 3;

      const virtualizer = createMockVirtualizer({
        scrollMargin,
        scrollOffset,
        measurementsCache,
      });

      renderHook(() => useAnchorVirtualizerToItemIndex(virtualizer, targetIndex));

      // item 3 starts at 30 + 100 + 50 = 180
      const expectedTarget = scrollMargin + 180;
      expect(virtualizer.options.scrollToFn).toHaveBeenCalledWith(
        scrollOffset,
        { behavior: undefined, adjustments: expectedTarget - scrollOffset },
        virtualizer
      );
      expect(virtualizer.scrollOffset).toBe(expectedTarget);
    });
  });

  describe('VirtualizedCascadeRowList', () => {
    it('should provide specific props to the passed renderer correctly', () => {
      const rowRenderer = jest.fn(() => null);
      const mockRows = rowsToRender(50);
      const mockVirtualItems = [
        { index: 0, start: 0, end: 50 },
        { index: 1, start: 51, end: 100 },
      ];
      const getVirtualItems = jest.fn(() => mockVirtualItems);

      render(
        <VirtualizedCascadeRowList
          rows={mockRows}
          virtualizedRowComputedTranslateValue={new Map()}
          activeStickyIndex={null}
          // @ts-expect-error -- we're only interested in testing the rowRenderer prop here
          getVirtualItems={getVirtualItems}
          listItemRenderer={rowRenderer}
        />
      );

      expect(rowRenderer).toHaveBeenCalledTimes(mockVirtualItems.length);
      expect(rowRenderer).toHaveBeenCalledWith(
        expect.objectContaining({
          row: expect.any(Object), // because we passed an empty array as rows
          virtualItem: expect.any(Object),
          virtualRowStyle: expect.objectContaining({
            transform: expect.stringMatching(/translateY\(\d+px\)/),
            zIndex: expect.any(Number),
          }),
          isActiveSticky: expect.any(Boolean),
        })
      );
    });
  });
});
