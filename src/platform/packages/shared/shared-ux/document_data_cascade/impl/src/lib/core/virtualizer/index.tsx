/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type CSSProperties, Fragment, useCallback, useRef, useMemo } from 'react';
import { type Row } from '@tanstack/react-table';
import { useVirtualizer, defaultRangeExtractor, type VirtualItem } from '@tanstack/react-virtual';
import type { GroupNode } from '../../../store_provider';

type UseVirtualizerOptions = Parameters<typeof useVirtualizer>[0];
type UseVirtualizerReturnType = ReturnType<typeof useVirtualizer>;

export interface CascadeVirtualizerProps<G extends GroupNode>
  extends Pick<UseVirtualizerOptions, 'getScrollElement' | 'overscan'> {
  rows: Row<G>[];
  /**
   * setting a value of true causes the active group root row
   * to stick right under the header
   */
  enableStickyGroupHeader: boolean;
  estimatedRowHeight?: number;
}

export interface UseVirtualizedRowScrollStateStoreOptions {
  /**
   * Function to get the parent virtualizer instance
   */
  getVirtualizer: () => ReturnType<typeof useCascadeVirtualizer>;
  /**
   * The index of the current row in the parent virtualizer
   */
  rowIndex: number;
}

export interface VirtualizedRowScrollState {
  scrollOffset: number;
  scrollMargin: number;
}

export interface VirtualizedCascadeListProps<G extends GroupNode>
  extends Pick<
    CascadeVirtualizerReturnValue,
    'virtualizedRowComputedTranslateValue' | 'getVirtualItems'
  > {
  rows: Row<G>[];
  activeStickyIndex: number | null;
  listItemRenderer: (props: {
    isActiveSticky: boolean;
    virtualItem: VirtualItem;
    virtualRowStyle: React.CSSProperties;
    row: Row<G>;
  }) => React.ReactNode;
}

/**
 * Calculates the active sticky index from the current visible range.
 * Idea here is to find the nearest expanded parent index
 * and add the index of the current row to the range of visible items rendered to the user.
 * This should be called directly in the consuming component to ensure the value
 * is always current and never stale due to intermediate memoization.
 */
export function calculateActiveStickyIndex<G extends GroupNode>(
  rows: Row<G>[],
  startIndex: number,
  enableStickyGroupHeader: boolean
): number | null {
  if (!enableStickyGroupHeader) {
    return null;
  }

  const rangeStartRow = rows[startIndex];
  if (!rangeStartRow) {
    return null;
  }

  const rangeStartParentRows = rangeStartRow.getParentRows();

  if (!rangeStartParentRows.length && !rangeStartRow.getIsExpanded()) {
    return null;
  }

  if (!rangeStartParentRows.length && rangeStartRow.getIsExpanded()) {
    return rangeStartRow.index;
  }

  const nearestExpandedParentIndex = rangeStartParentRows.reduce<number>((acc, row, idx) => {
    return (acc += row.index + idx);
  }, 0);

  const isExpandedLeafRow = !rangeStartRow.subRows.length && rangeStartRow.getIsExpanded();

  return isExpandedLeafRow
    ? // we add 1 to the index to account for the fact that
      // we get an zero based index for children in relation to the parent
      nearestExpandedParentIndex + rangeStartRow.index + 1
    : nearestExpandedParentIndex;
}

export interface CascadeVirtualizerReturnValue
  extends Pick<
    UseVirtualizerReturnType,
    | 'getTotalSize'
    | 'getVirtualItems'
    | 'isScrolling'
    | 'measureElement'
    | 'scrollOffset'
    | 'scrollElement'
    | 'range'
  > {
  virtualizedRowComputedTranslateValue: Map<number, number>;
  virtualizedRowsSizeCache: Map<number, number>;
  scrollToVirtualizedIndex: UseVirtualizerReturnType['scrollToIndex'];
  scrollToLastVirtualizedRow: () => void;
  /**
   * Registers a row by its index from propagation changes in its row size to the parent virtualizer.
   * This is only required to be invoked for nested virtualizers to prevent jank caused by nested virtualizers size
   * changes that propagate further into the parent virtualizer,in turn causing the parent virtualizer to need to remeasure itself.
   */
  preventRowSizeChangePropagation: (rowIndex: number) => () => void;
  /**
   * Checks if the row at the given index has opted to prevent size change propagation to the parent virtualizer.
   */
  sizeChangePropagationPrevented: (rowIndex: number) => boolean;
}

export interface VirtualizerRangeExtractorArgs<G extends GroupNode> {
  rows: Row<G>[];
  enableStickyGroupHeader: boolean;
}

/**
 * @internal
 * @description custom range extractor for cascade component, used to modify the range items the virtualizer displays,
 * we leverage it in this case to include group rows we'd like to render as sticky headings.
 * see {@link https://tanstack.com/virtual/v3/docs/api/virtualizer#rangeextractor} for more details
 */
export const useCascadeVirtualizerRangeExtractor = <G extends GroupNode>({
  rows,
  enableStickyGroupHeader,
}: VirtualizerRangeExtractorArgs<G>) => {
  return useCallback<NonNullable<UseVirtualizerOptions['rangeExtractor']>>(
    (range) => {
      if (!enableStickyGroupHeader) {
        return defaultRangeExtractor(range);
      }

      // Calculate the sticky index to include in the render range
      const activeStickyIndex = calculateActiveStickyIndex(rows, range.startIndex, true);

      const next = new Set(
        [activeStickyIndex, ...defaultRangeExtractor(range)].filter(Number.isInteger) as number[]
      );

      return Array.from(next).sort((a, b) => a - b);
    },
    [rows, enableStickyGroupHeader]
  );
};

export const useCascadeVirtualizer = <G extends GroupNode>({
  overscan,
  enableStickyGroupHeader,
  estimatedRowHeight = 0,
  rows,
  getScrollElement,
}: CascadeVirtualizerProps<G>): CascadeVirtualizerReturnValue => {
  const virtualizedRowsSizeCacheRef = useRef<Map<number, number>>(new Map());

  const rangeExtractor = useCascadeVirtualizerRangeExtractor<G>({
    rows,
    enableStickyGroupHeader,
  });

  /**
   * Records the computed translate value for each item of virtualized row
   */
  const virtualizedRowComputedTranslateValueRef = useRef(new Map<number, number>());

  /**
   * Tracks rows that don't want to propagate changes in their row size to the parent virtualizer by their indices.
   */
  const rowSizeChangePropagationPreventedRef = useRef<Set<number>>(new Set());

  const sizeChangePropagationPrevented = useCallback((rowIndex: number) => {
    return rowSizeChangePropagationPreventedRef.current.has(rowIndex);
  }, []);

  const virtualizerOptions = useMemo<UseVirtualizerOptions>(
    () => ({
      count: rows.length,
      estimateSize: () => estimatedRowHeight,
      getScrollElement,
      overscan,
      rangeExtractor,
      onChange: (rowVirtualizerInstance) => {
        // @ts-expect-error -- the itemsSizeCache property does exist,
        // but it not included in the type definition because it is marked as a private property,
        // see {@link https://github.com/TanStack/virtual/blob/v3.13.2/packages/virtual-core/src/index.ts#L360}
        virtualizedRowsSizeCacheRef.current = rowVirtualizerInstance.itemSizeCache;
      },
    }),
    [estimatedRowHeight, getScrollElement, overscan, rangeExtractor, rows.length]
  );

  const virtualizerImpl = useVirtualizer(virtualizerOptions);

  /**
   * We don't want to adjust scroll position for rows
   * that don't want to propagate size changes to the parent virtualizer.
   */
  virtualizerImpl.shouldAdjustScrollPositionOnItemSizeChange = (item) => {
    return !sizeChangePropagationPrevented(item.index);
  };

  /**
   * Register a row as not wanting to propagate size changes to the parent virtualizer.
   * Returns an unregister function.
   */
  const preventRowSizeChangePropagation = useCallback((rowIndex: number) => {
    rowSizeChangePropagationPreventedRef.current.add(rowIndex);
    return () => {
      // remove the row from prevention set and measure the row again
      rowSizeChangePropagationPreventedRef.current.delete(rowIndex);
    };
  }, []);

  return useMemo(
    () => ({
      get scrollOffset() {
        return virtualizerImpl.scrollOffset;
      },
      get range() {
        return virtualizerImpl.range;
      },
      getTotalSize: virtualizerImpl.getTotalSize.bind(virtualizerImpl),
      getVirtualItems: virtualizerImpl.getVirtualItems.bind(virtualizerImpl),
      measureElement: virtualizerImpl.measureElement.bind(virtualizerImpl),
      scrollToVirtualizedIndex: virtualizerImpl.scrollToIndex.bind(virtualizerImpl),
      get isScrolling() {
        return virtualizerImpl.isScrolling;
      },
      get scrollElement() {
        return virtualizerImpl.scrollElement;
      },
      get scrollToLastVirtualizedRow() {
        return () => this.scrollToVirtualizedIndex(rows.length - 1);
      },
      get virtualizedRowComputedTranslateValue() {
        return virtualizedRowComputedTranslateValueRef.current;
      },
      get virtualizedRowsSizeCache() {
        return virtualizedRowsSizeCacheRef.current;
      },
      preventRowSizeChangePropagation,
      sizeChangePropagationPrevented,
    }),
    [virtualizerImpl, rows.length, preventRowSizeChangePropagation, sizeChangePropagationPrevented]
  );
};

export const useVirtualizedRowScrollState = ({
  getVirtualizer,
  rowIndex,
}: UseVirtualizedRowScrollStateStoreOptions) => {
  const virtualizer = useMemo(() => getVirtualizer(), [getVirtualizer]);

  const getScrollMargin = useCallback(() => {
    const sizeCache = virtualizer.virtualizedRowsSizeCache;
    let margin = 0;
    for (let i = 0; i < rowIndex; i++) {
      margin += sizeCache.get(i) ?? 0;
    }
    return margin;
  }, [virtualizer, rowIndex]);
  const getScrollOffset = useCallback(() => virtualizer.scrollOffset ?? 0, [virtualizer]);

  return useMemo(
    () => ({
      getScrollMargin,
      getScrollOffset,
    }),
    [getScrollMargin, getScrollOffset]
  );
};

/**
 * @description returns the position style for the grid row, in relation to the scrolled virtualized row.
 * Z-index is calculated as (visibleRowCount - renderIndex) to ensure rows higher in the list
 * have higher z-index values. This prevents visual glitches during row expansion where
 * unmeasured rows below might briefly appear over the expanding row
 * because of their transform value has yet to update.
 */
export const getGridRowPositioningStyle = (
  renderIndex: number,
  virtualizedRowComputedTranslateValueMap: Map<number, number>,
  visibleRowCount: number
): CSSProperties => {
  return {
    transform: `translateY(${virtualizedRowComputedTranslateValueMap.get(renderIndex) ?? 0}px)`,
    zIndex: visibleRowCount - renderIndex,
  };
};

export function VirtualizedCascadeRowList<G extends GroupNode>({
  activeStickyIndex,
  getVirtualItems,
  virtualizedRowComputedTranslateValue,
  rows,
  listItemRenderer,
}: VirtualizedCascadeListProps<G>) {
  const virtualItems = getVirtualItems();

  return virtualItems.map(function buildCascadeRows(virtualItem, renderIndex) {
    const row = rows[virtualItem.index];

    const isActiveSticky = activeStickyIndex === virtualItem.index;

    // side effect to record the computed translate value for each item of virtualized row,
    // doing this allows us to position the header correctly in relation to the scrolled virtualized rows
    virtualizedRowComputedTranslateValue.set(renderIndex, virtualItem.start);

    return (
      <Fragment key={row.id}>
        {listItemRenderer({
          row,
          isActiveSticky,
          virtualItem,
          virtualRowStyle: getGridRowPositioningStyle(
            renderIndex,
            virtualizedRowComputedTranslateValue,
            virtualItems.length
          ),
        })}
      </Fragment>
    );
  });
}
