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
      expect(result.current).toHaveProperty('activeStickyIndex');
      expect(result.current).toHaveProperty('virtualizedRowsSizeCache');
      expect(result.current).toHaveProperty('virtualizedRowComputedTranslateValue');
      expect(result.current).toHaveProperty('scrollToVirtualizedIndex');
      expect(result.current).toHaveProperty('scrollToLastVirtualizedRow');
      expect(result.current).toHaveProperty('scrollOffset');
      expect(result.current).toHaveProperty('measureElement');
    });
  });

  describe('useCascadeVirtualizerRangeExtractor', () => {
    it('should return the default virtualizer range when the prop `enableStickyGroupHeader` is false', () => {
      const setActiveStickyIndex = jest.fn();

      const { result } = renderHook(() =>
        useCascadeVirtualizerRangeExtractor({
          rows: rowsToRender(100),
          enableStickyGroupHeader: false,
          setActiveStickyIndex,
        })
      );

      const range: Range = {
        startIndex: 10,
        endIndex: 20,
        overscan: 5,
        count: 10,
      };

      expect(result.current(range)).toEqual(defaultRangeExtractor(range));
      expect(setActiveStickyIndex).not.toHaveBeenCalled();
    });

    it('will mark a row with depth 0 as sticky when the prop `enableStickyGroupHeader` is true and the row is expanded', () => {
      const rows = rowsToRender(100);

      const expandedRowIndex = 0;

      // mock the group row with depth 0 as expanded
      jest.spyOn(rows[expandedRowIndex], 'getIsExpanded').mockReturnValue(true);

      const setActiveStickyIndex = jest.fn();

      const { result } = renderHook(() =>
        useCascadeVirtualizerRangeExtractor({
          rows,
          enableStickyGroupHeader: true,
          setActiveStickyIndex,
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
      expect(setActiveStickyIndex).toHaveBeenCalledWith(expandedRowIndex);
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

      const setActiveStickyIndex = jest.fn();

      const { result } = renderHook(() =>
        useCascadeVirtualizerRangeExtractor({
          rows,
          enableStickyGroupHeader: true,
          setActiveStickyIndex,
        })
      );

      expect(result.current(range)).toEqual(expect.arrayContaining([parentRowIndex]));
      expect(setActiveStickyIndex).toHaveBeenCalledWith(parentRowIndex);
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
        >
          {rowRenderer}
        </VirtualizedCascadeRowList>
      );

      expect(rowRenderer).toHaveBeenCalledTimes(mockVirtualItems.length);
      expect(rowRenderer).toHaveBeenCalledWith(
        expect.objectContaining({
          row: expect.any(Object), // because we passed an empty array as rows
          virtualItem: expect.any(Object),
          virtualRowStyle: expect.objectContaining({
            transform: expect.stringMatching(/translateY\(\d+px\)/),
          }),
          isActiveSticky: expect.any(Boolean),
        })
      );
    });
  });
});
