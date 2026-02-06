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
import { defaultRangeExtractor, type Range } from '@tanstack/react-virtual';
import type { GroupNode } from '../../../store_provider';
import {
  useCascadeVirtualizer,
  useCascadeVirtualizerRangeExtractor,
  VirtualizedCascadeRowList,
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
