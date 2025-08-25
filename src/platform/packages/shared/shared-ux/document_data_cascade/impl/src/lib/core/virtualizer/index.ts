/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { useRef, useCallback } from 'react';
import { type Row } from '@tanstack/react-table';
import { useVirtualizer, defaultRangeExtractor } from '@tanstack/react-virtual';
import type { GroupNode } from '../../../store_provider';

export interface VirtualizerHelperProps<G extends GroupNode>
  extends Pick<Parameters<typeof useVirtualizer>[0], 'getScrollElement' | 'overscan'> {
  rows: Row<G>[];
  /**
   * cause the active group root row to stick right under the header
   */
  enableStickyGroupHeader: boolean;
}

interface VirtualizerHelperReturn {
  activeStickyIndex: number | null;
  rowVirtualizer: ReturnType<typeof useVirtualizer>;
  virtualizedRowComputedTranslateValue: Map<number, number>;
  virtualizedRowsSizeCache: Map<number, number>;
}

export const useRowVirtualizerHelper = <G extends GroupNode>({
  overscan,
  enableStickyGroupHeader,
  rows,
  getScrollElement,
}: VirtualizerHelperProps<G>): VirtualizerHelperReturn => {
  const virtualizedRowsSizeCacheRef = useRef<Map<number, number>>(new Map());
  const activeStickyIndexRef = useRef<number | null>(null);

  /**
   * @description records the computed translate value for each item of virtualized row
   */
  const virtualizedRowComputedTranslateValueRef = useRef(new Map<number, number>());

  /**
   * @description range extractor, used to inform virtualizer about our rendering needs in relation to marking specific rows as sticky rows.
   * see {@link https://tanstack.com/virtual/latest/docs/api/virtualizer#rangeextractor} for more details
   */
  const rangeExtractor = useCallback<
    NonNullable<Parameters<typeof useVirtualizer>[0]['rangeExtractor']>
  >(
    (range) => {
      if (!enableStickyGroupHeader) {
        return defaultRangeExtractor(range);
      }

      const rangeStartRow = rows[range.startIndex];

      // TODO: get buy in to make all item parents sticky, right now we only select the top most parent as sticky
      activeStickyIndexRef.current =
        rangeStartRow.subRows?.length && rangeStartRow.getIsExpanded()
          ? rangeStartRow.index
          : rangeStartRow.getParentRows()[0]?.index ?? null;
      const next = new Set(
        [activeStickyIndexRef.current, ...defaultRangeExtractor(range)].filter(Boolean)
      );
      return Array.from(next).sort((a, b) => a - b);
    },
    [rows, enableStickyGroupHeader]
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 0,
    getScrollElement,
    overscan,
    rangeExtractor,
    onChange: (rowVirtualizerInstance) => {
      // @ts-expect-error -- the itemsSizeCache property does exist,
      // but it not included in the type definition because it is marked as a private property,
      // see {@link https://github.com/TanStack/virtual/blob/v3.13.2/packages/virtual-core/src/index.ts#L360}
      virtualizedRowsSizeCacheRef.current = rowVirtualizerInstance.itemSizeCache;
    },
  });

  return {
    rowVirtualizer: virtualizer,
    get virtualizedRowsSizeCache() {
      return virtualizedRowsSizeCacheRef.current;
    },
    get activeStickyIndex() {
      return activeStickyIndexRef.current;
    },
    get virtualizedRowComputedTranslateValue() {
      return virtualizedRowComputedTranslateValueRef.current;
    },
  };
};

/**
 * @description returns the position style for the header row, in relation to the scrolled virtualized row
 */
export const getGridHeaderPositioningStyle = (
  virtualizedRowComputedTranslateValueMap: Map<number, number>
): React.CSSProperties => ({
  top: -(virtualizedRowComputedTranslateValueMap.get(0) ?? 0),
  transform: `translate3d(0, ${virtualizedRowComputedTranslateValueMap.get(0) ?? 0}px, 0)`,
});

/**
 * @description returns the position style for the grid row, in relation to the scrolled virtualized row
 */
export const getGridRowPositioningStyle = (
  renderIndex: number,
  isActiveStickyRow: boolean,
  virtualizedRowComputedTranslateValueMap: Map<number, number>
): React.CSSProperties => {
  return !isActiveStickyRow
    ? {
        transform: `translateY(${virtualizedRowComputedTranslateValueMap.get(renderIndex) ?? 0}px)`,
      }
    : {};
};
