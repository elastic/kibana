/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, renderHook, render } from '@testing-library/react';
import * as ReactVirtual from '@tanstack/react-virtual';
import { defaultRangeExtractor, type Range } from '@tanstack/react-virtual';
import type { GroupNode } from '../../../store_provider';
import type { CascadeTableRow } from '../table';
import {
  useCascadeVirtualizer,
  calculateActiveStickyIndex,
  useCascadeVirtualizerRangeExtractor,
  VirtualizedCascadeRowList,
  type VirtualizerInstanceType,
} from '.';
import { useAnchorVirtualizerToItemIndex } from './use_scroll_restoration';

const rowsToRender = (rowCount: number): Array<CascadeTableRow<GroupNode>> => {
  return Array.from(
    { length: rowCount },
    (_, index) =>
      new Proxy(
        {
          id: `row-${index}`,
          index,
          depth: 0,
          getIsExpanded: () => false,
          getParentRows: () => [] as Array<CascadeTableRow<GroupNode>>,
          subRows: [] as Array<CascadeTableRow<GroupNode>>,
        } as CascadeTableRow<GroupNode>,
        {
          // escape hatch so we don't have to mock every property on the Row object
          get(target, prop) {
            return Reflect.get(target, prop);
          },
        }
      )
  );
};

jest.mock('@tanstack/react-virtual', () => {
  const actual = jest.requireActual('@tanstack/react-virtual');
  return { ...actual, useVirtualizer: jest.fn(actual.useVirtualizer) };
});

describe('virtualizer', () => {
  describe('calculateActiveStickyIndex', () => {
    it('uses flattened indices for expanded rows after earlier expanded siblings', () => {
      const rows = rowsToRender(6);
      rows[4].index = 1;
      jest.spyOn(rows[4], 'getIsExpanded').mockReturnValue(true);
      expect(calculateActiveStickyIndex(rows, 4, true)).toBe(4);
    });

    it('selects the nearest parent by identity through multiple nesting levels', () => {
      const rows = rowsToRender(8);
      rows[5].index = 0;
      jest.spyOn(rows[6], 'getParentRows').mockReturnValue([rows[2], rows[5]]);
      expect(calculateActiveStickyIndex(rows, 6, true)).toBe(5);
    });

    it('selects an expanded leaf itself and restores its parent for a collapsed sibling', () => {
      const rows = rowsToRender(8);
      rows[5].index = 0;
      jest.spyOn(rows[5], 'getParentRows').mockReturnValue([rows[2], rows[4]]);
      jest.spyOn(rows[5], 'getIsExpanded').mockReturnValue(true);
      jest.spyOn(rows[6], 'getParentRows').mockReturnValue([rows[2], rows[4]]);
      expect(calculateActiveStickyIndex(rows, 5, true)).toBe(5);
      expect(calculateActiveStickyIndex(rows, 6, true)).toBe(4);
    });

    it('has no candidate for disabled stickiness, collapsed roots or an empty range', () => {
      const rows = rowsToRender(1);
      expect(calculateActiveStickyIndex(rows, 0, false)).toBeNull();
      expect(calculateActiveStickyIndex(rows, 0, true)).toBeNull();
      expect(calculateActiveStickyIndex([], 0, true)).toBeNull();
    });
  });

  describe('useCascadeVirtualizer', () => {
    it.each([0, 4])(
      'retains the flattened root row %i size while its child is in fullscreen',
      (rowIndex) => {
        const spy = jest.mocked(ReactVirtual.useVirtualizer);
        const rows = rowsToRender(5);
        rows[rowIndex].index = 0;
        const { result } = renderHook(() =>
          useCascadeVirtualizer({
            rows,
            enableStickyGroupHeader: true,
            getScrollElement: () => document.body,
          })
        );

        const instance = spy.mock.results.at(-1)?.value as VirtualizerInstanceType;

        const element = document.createElement('div');
        element.dataset.index = String(rowIndex);
        Object.defineProperty(element, 'offsetHeight', { value: 40 });

        act(() => {
          instance.resizeItem(rowIndex, 2000);
          instance.getTotalSize();
        });

        const handle = result.current.childController?.connect('fullscreen-cell', rowIndex);
        handle?.detachScrollElement();

        expect(instance.options.measureElement(element, undefined, instance)).toBe(2000);
      }
    );

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
      expect(result.current).toHaveProperty('scrollToVirtualizedIndex');
      expect(result.current).toHaveProperty('scrollOffset');
      expect(result.current).toHaveProperty('measureElement');
      expect(result.current).toHaveProperty('measurementsCache');
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
        .mockReturnValue([rows[parentRowIndex]] as Array<CascadeTableRow<GroupNode>>);

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
  });

  describe('useAnchorVirtualizerToItemIndex', () => {
    const createVirtualizer = () =>
      new ReactVirtual.Virtualizer<Element, Element>({
        count: 10,
        getScrollElement: () => null,
        estimateSize: () => 65,
        observeElementOffset: jest.fn(),
        observeElementRect: jest.fn(),
        scrollToFn: jest.fn(),
      });

    it.each([undefined, -1, 12])(
      'finishes without scrolling for absent or invalid anchor %s',
      (anchor) => {
        const instance = createVirtualizer();
        const scroll = jest.spyOn(instance, 'scrollToIndex');
        const { result } = renderHook(() => useAnchorVirtualizerToItemIndex(instance, anchor));
        expect(result.current.isRestored).toBe(true);
        expect(scroll).not.toHaveBeenCalled();
      }
    );

    it.each([0, 4, 9])('starts exactly one native restoration for anchor %i', (anchor) => {
      const instance = createVirtualizer();
      const scroll = jest.spyOn(instance, 'scrollToIndex');
      const { result, rerender } = renderHook(() =>
        useAnchorVirtualizerToItemIndex(instance, anchor)
      );
      rerender();
      expect(result.current.isRestored).toBe(true);
      expect(scroll).toHaveBeenCalledTimes(1);
      expect(scroll).toHaveBeenCalledWith(anchor, { align: 'start', behavior: 'auto' });
    });

    it('finishes when the saved data is now empty', () => {
      const instance = createVirtualizer();
      instance.setOptions({ ...instance.options, count: 0 });
      const { result } = renderHook(() => useAnchorVirtualizerToItemIndex(instance, 2));
      expect(result.current.isRestored).toBe(true);
    });

    it('cancels native reconciliation when the user takes over', () => {
      const instance = createVirtualizer();
      const cancel = jest.spyOn(instance, 'cancelScroll');
      const { result } = renderHook(() => useAnchorVirtualizerToItemIndex(instance, 4));
      act(() => result.current.cancel());
      expect(cancel).toHaveBeenCalled();
      expect(result.current.isRestored).toBe(true);
    });
  });

  describe('VirtualizedCascadeRowList', () => {
    it('should provide specific props to the passed renderer correctly', () => {
      const rowRenderer = jest.fn(() => null);
      const mockRows = rowsToRender(50);
      const mockVirtualItems = [
        { index: 0, start: 0, end: 50, size: 50, key: 'row-0', lane: 0 },
        { index: 1, start: 51, end: 100, size: 49, key: 'row-1', lane: 0 },
      ];
      const getVirtualItems = Object.assign(
        jest.fn(() => mockVirtualItems),
        {
          updateDeps: jest.fn(),
        }
      );

      render(
        <VirtualizedCascadeRowList
          rows={mockRows}
          activeStickyIndex={null}
          getVirtualItems={getVirtualItems}
          listItemRenderer={rowRenderer}
        />
      );

      expect(rowRenderer).toHaveBeenCalledTimes(mockVirtualItems.length);
      expect(rowRenderer).toHaveBeenCalledWith(
        expect.objectContaining({
          row: expect.any(Object), // because we passed an empty array as rows
          virtualItem: expect.any(Object),
          isActiveSticky: expect.any(Boolean),
        })
      );
    });
  });
});
