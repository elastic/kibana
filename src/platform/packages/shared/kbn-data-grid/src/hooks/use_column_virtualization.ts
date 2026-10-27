/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { isEqual } from 'lodash';
import { useVirtualizer } from '@tanstack/react-virtual';
import { COLUMN_OVERSCAN } from '../constants';
import type { DataGridInternalColumn } from '../types';

export interface ColumnLayout {
  /** Width in pixels. */
  width: number;
  /** Set for control columns: they stay in view while the other columns scroll. */
  sticky?: {
    side: 'left' | 'right';
    offset: number;
    /** The last column of its side, next to the columns that scroll. */
    isEdge: boolean;
  };
}

interface UseColumnVirtualizationParams<TRow> {
  scrollRef: RefObject<HTMLElement | null>;
  columns: Array<DataGridInternalColumn<TRow>>;
  widths: number[];
  /** Number of data columns, after the leading control columns, that stay in view too. */
  stickyColumnCount: number;
}

/**
 * Leading and trailing control columns, and the first `stickyColumnCount` data columns, are always
 * rendered and sticky, the columns in between are virtualized horizontally. `renderedIndexes` are the indexes (into `columns`) to render, in order.
 */
export const useColumnVirtualization = <TRow>({
  scrollRef,
  columns,
  widths,
  stickyColumnCount,
}: UseColumnVirtualizationParams<TRow>) => {
  const { leadingControlCount, leadingCount, trailingCount } = useMemo(() => {
    const firstData = columns.findIndex(({ isControl }) => !isControl);
    if (firstData === -1) {
      return {
        leadingControlCount: columns.length,
        leadingCount: columns.length,
        trailingCount: 0,
      };
    }
    let lastData = columns.length - 1;
    while (columns[lastData].isControl) {
      lastData--;
    }
    const dataCount = lastData - firstData + 1;
    return {
      leadingControlCount: firstData,
      leadingCount: firstData + Math.min(Math.max(stickyColumnCount, 0), dataCount),
      trailingCount: columns.length - 1 - lastData,
    };
  }, [columns, stickyColumnCount]);

  const middleCount = columns.length - leadingCount - trailingCount;
  // Summing the widths of all columns is only needed when a width changes, not on every scroll.
  const { leadingWidth, trailingWidth, totalWidth } = useMemo(() => {
    const sum = (from: number, to: number) => {
      let total = 0;
      for (let index = from; index < to; index++) {
        total += widths[index];
      }
      return total;
    };
    return {
      leadingWidth: sum(0, leadingCount),
      trailingWidth: sum(columns.length - trailingCount, columns.length),
      totalWidth: sum(0, columns.length),
    };
  }, [widths, columns.length, leadingCount, trailingCount]);

  const estimateSize = useCallback(
    (middleIndex: number) => widths[leadingCount + middleIndex],
    [widths, leadingCount]
  );

  const virtualizer = useVirtualizer({
    horizontal: true,
    count: middleCount,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: COLUMN_OVERSCAN,
    scrollMargin: leadingWidth,
    // Control columns cover the edges of the scroll area.
    scrollPaddingStart: leadingWidth,
    scrollPaddingEnd: trailingWidth,
  });

  // The sizes are estimates the virtualizer caches: tell it when the widths changed.
  useEffect(() => {
    virtualizer.measure();
  }, [virtualizer, widths]);

  // A column keeps its layout object while its width and offset are the same. Cells compare it, so
  // resizing one column does not render the cells of all the other columns again.
  const previousLayouts = useRef<ColumnLayout[]>([]);
  const layouts = useMemo<ColumnLayout[]>(() => {
    let leftOffset = 0;
    let rightOffset = 0;
    const result: ColumnLayout[] = widths.map((width) => ({ width }));
    for (let index = 0; index < leadingCount; index++) {
      result[index] = {
        width: widths[index],
        sticky: {
          side: 'left',
          offset: leftOffset,
          // A line only next to pinned data columns, not after the control columns.
          isEdge: leadingCount > leadingControlCount && index === leadingCount - 1,
        },
      };
      leftOffset += widths[index];
    }
    for (let index = columns.length - 1; index >= columns.length - trailingCount; index--) {
      result[index] = {
        width: widths[index],
        sticky: {
          side: 'right',
          offset: rightOffset,
          isEdge: false,
        },
      };
      rightOffset += widths[index];
    }
    const reused = result.map((layout, index) =>
      isEqual(previousLayouts.current[index], layout) ? previousLayouts.current[index] : layout
    );
    previousLayouts.current = reused;
    return reused;
  }, [widths, columns.length, leadingControlCount, leadingCount, trailingCount]);

  const virtualItems = virtualizer.getVirtualItems();
  const firstItem = virtualItems[0];
  const lastItem = virtualItems[virtualItems.length - 1];

  const renderedIndexes = useMemo(() => {
    const leading = Array.from({ length: leadingCount }, (_, index) => index);
    const middle = virtualItems.map(({ index }) => leadingCount + index);
    const trailing = Array.from(
      { length: trailingCount },
      (_, index) => columns.length - trailingCount + index
    );
    return [...leading, ...middle, ...trailing];
  }, [virtualItems, leadingCount, trailingCount, columns.length]);

  // Space of the virtualized columns that are not rendered, before and after the rendered ones.
  const startSpacer = firstItem ? firstItem.start - leadingWidth : 0;
  const endSpacer = lastItem ? totalWidth - trailingWidth - lastItem.end : 0;

  const scrollToColumn = useCallback(
    (columnIndex: number) => {
      const middleIndex = columnIndex - leadingCount;
      if (middleIndex >= 0 && middleIndex < middleCount) {
        virtualizer.scrollToIndex(middleIndex);
      }
    },
    [virtualizer, leadingCount, middleCount]
  );

  return {
    layouts,
    renderedIndexes,
    startSpacer,
    endSpacer,
    leadingControlCount,
    leadingCount,
    middleCount,
    totalWidth,
    scrollToColumn,
  };
};
