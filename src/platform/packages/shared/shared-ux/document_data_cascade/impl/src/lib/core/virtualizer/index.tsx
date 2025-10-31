/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useCallback, useRef, useState, useMemo, type CSSProperties } from 'react';
import { type Row } from '@tanstack/react-table';
import { useVirtualizer, defaultRangeExtractor, type VirtualItem } from '@tanstack/react-virtual';
import type { GroupNode } from '../../../store_provider';

type UseVirtualizerOptions = Parameters<typeof useVirtualizer>[0];

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

export interface CascadeVirtualizerReturnValue
  extends Pick<
    ReturnType<typeof useVirtualizer>,
    'getTotalSize' | 'getVirtualItems' | 'measureElement' | 'scrollOffset' | 'scrollElement'
  > {
  activeStickyIndex: number | null;
  virtualizedRowComputedTranslateValue: Map<number, number>;
  virtualizedRowsSizeCache: Map<number, number>;
  scrollToVirtualizedIndex: (index: number) => void;
  scrollToLastVirtualizedRow: () => void;
}

export interface VirtualizerRangeExtractorArgs<G extends GroupNode> {
  rows: Row<G>[];
  enableStickyGroupHeader: boolean;
  setActiveStickyIndex: (index: number | null) => void;
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
  setActiveStickyIndex,
}: VirtualizerRangeExtractorArgs<G>) => {
  const activeStickyIndexRef = useRef<number | null>(null);

  return useCallback<NonNullable<UseVirtualizerOptions['rangeExtractor']>>(
    (range) => {
      const rangeStartRow = rows[range.startIndex];

      if (!enableStickyGroupHeader) {
        return defaultRangeExtractor(range);
      }

      let parentRows;

      // when it's a group row and there
      activeStickyIndexRef.current =
        rangeStartRow.depth === 0 && rangeStartRow.getIsExpanded()
          ? // select the row as is when it's a root group row
            rangeStartRow.index
          : // when its a group that's not of depth 0, it must have a parent row that is already expanded
          (parentRows = rangeStartRow.getParentRows())?.length
          ? parentRows.reduce<number | null>((acc, row, idx) => {
              return (acc! += row.index + idx);
            }, 0)
          : null;

      const next = new Set(
        [activeStickyIndexRef.current, ...defaultRangeExtractor(range)].filter(
          Number.isInteger
        ) as number[]
      );

      setActiveStickyIndex(activeStickyIndexRef.current);

      return Array.from(next).sort((a, b) => a - b);
    },
    [rows, enableStickyGroupHeader, setActiveStickyIndex]
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
  const [activeStickyIndex, setActiveStickyIndex] = useState<number | null>(null);
  const rangeExtractor = useCascadeVirtualizerRangeExtractor<G>({
    rows,
    enableStickyGroupHeader,
    setActiveStickyIndex,
  });

  /**
   * @description records the computed translate value for each item of virtualized row
   */
  const virtualizedRowComputedTranslateValueRef = useRef(new Map<number, number>());

  const virtualizerOptions = useMemo<UseVirtualizerOptions>(
    () => ({
      count: rows.length,
      estimateSize: () => estimatedRowHeight,
      getScrollElement,
      overscan,
      rangeExtractor,
      useAnimationFrameWithResizeObserver: true,
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

  return useMemo(
    () => ({
      activeStickyIndex,
      getVirtualItems: virtualizerImpl.getVirtualItems.bind(virtualizerImpl),
      getTotalSize: virtualizerImpl.getTotalSize.bind(virtualizerImpl),
      get scrollOffset() {
        return virtualizerImpl.scrollOffset;
      },
      get scrollToLastVirtualizedRow() {
        return () => virtualizerImpl.scrollToIndex(rows.length - 1);
      },
      scrollToVirtualizedIndex: virtualizerImpl.scrollToIndex.bind(virtualizerImpl),
      measureElement: virtualizerImpl.measureElement.bind(virtualizerImpl),
      get virtualizedRowsSizeCache() {
        return virtualizedRowsSizeCacheRef.current;
      },
      get virtualizedRowComputedTranslateValue() {
        return virtualizedRowComputedTranslateValueRef.current;
      },
      get scrollElement() {
        return virtualizerImpl.scrollElement;
      },
    }),
    [activeStickyIndex, virtualizerImpl, rows.length]
  );
};

/**
 * @description returns the position style for the header row, in relation to the scrolled virtualized row
 */
export const getGridHeaderPositioningStyle = (
  virtualizedRowComputedTranslateValueMap: Map<number, number>
): CSSProperties => ({
  top: -(virtualizedRowComputedTranslateValueMap.get(0) ?? 0),
  transform: `translate3d(0, ${virtualizedRowComputedTranslateValueMap.get(0) ?? 0}px, 0)`,
});

/**
 * @description returns the position style for the grid row, in relation to the scrolled virtualized row
 */
export const getGridRowPositioningStyle = (
  renderIndex: number,
  virtualizedRowComputedTranslateValueMap: Map<number, number>
): CSSProperties => {
  return {
    transform: `translateY(${virtualizedRowComputedTranslateValueMap.get(renderIndex) ?? 0}px)`,
  };
};

export interface VirtualizedCascadeListProps<G extends GroupNode>
  extends Pick<
    CascadeVirtualizerReturnValue,
    'virtualizedRowComputedTranslateValue' | 'getVirtualItems' | 'activeStickyIndex'
  > {
  rows: Row<G>[];
  children: (props: {
    isActiveSticky: boolean;
    virtualItem: VirtualItem;
    virtualRowStyle: React.CSSProperties;
    row: Row<G>;
  }) => React.ReactNode;
}

export function VirtualizedCascadeRowList<G extends GroupNode>({
  activeStickyIndex,
  getVirtualItems,
  virtualizedRowComputedTranslateValue,
  rows,
  children,
}: VirtualizedCascadeListProps<G>) {
  return getVirtualItems().map(function buildCascadeRows(virtualItem, renderIndex) {
    const row = rows[virtualItem.index];

    const isActiveSticky = activeStickyIndex === virtualItem.index;

    // side effect to record the computed translate value for each item of virtualized row
    // allows us to position the header correctly in relation to the scrolled virtualized rows
    virtualizedRowComputedTranslateValue.set(renderIndex, virtualItem.start);

    return (
      <Fragment key={row.id}>
        {children({
          row,
          isActiveSticky,
          virtualItem,
          virtualRowStyle: getGridRowPositioningStyle(
            renderIndex,
            virtualizedRowComputedTranslateValue
          ),
        })}
      </Fragment>
    );
  });
}
