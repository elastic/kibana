/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FocusEvent, KeyboardEvent, RefObject } from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { VirtualItem } from '@tanstack/react-virtual';
import type { GridPosition } from '../utils/grid_navigation';
import {
  GRID_CELL_SELECTOR,
  GRID_KEYS,
  clamp,
  getGridPosition,
  getNextGridPosition,
} from '../utils/grid_navigation';

const FOCUS_RENDER_ATTEMPTS = 10;

interface UseGridNavigationParams {
  scrollRef: RefObject<HTMLElement | null>;
  showHeader: boolean;
  /** Number of data columns and control columns. */
  colCount: number;
  /** Column index (1-based) of the first column that is not a control column. */
  firstDataColIndex: number;
  rowCount: number;
  pinnedRowCount: number;
  virtualItems: VirtualItem[];
  /** Number of rows in the virtualized (not pinned) section. */
  virtualizedRowCount: number;
  scrollToVirtualizedRow: (index: number) => void;
}

/**
 * Roving tabindex: the grid is a single tab stop, arrow, Home and End keys move between its cells.
 * Positions are 1-based and match `aria-rowindex` and `aria-colindex`.
 */
export const useGridNavigation = ({
  scrollRef,
  showHeader,
  colCount,
  firstDataColIndex,
  rowCount,
  pinnedRowCount,
  virtualItems,
  virtualizedRowCount,
  scrollToVirtualizedRow,
}: UseGridNavigationParams) => {
  const ariaRowIndexOffset = showHeader ? 2 : 1;
  const firstRow = showHeader ? 1 : ariaRowIndexOffset;
  const lastRow = Math.max(rowCount + ariaRowIndexOffset - 1, firstRow);
  // aria-rowindex of the first virtualized row.
  const virtualizedStartRow = pinnedRowCount + ariaRowIndexOffset;

  const [tabStop, setTabStop] = useState<GridPosition>(() => ({
    row: ariaRowIndexOffset,
    col: firstDataColIndex,
  }));
  const effectiveTabStop = useMemo<GridPosition>(() => {
    let row = clamp(tabStop.row, firstRow, lastRow);
    // A virtualized row that is not rendered cannot be a tab stop, fall back to the first rendered one.
    if (row >= virtualizedStartRow && virtualItems.length > 0) {
      const index = row - virtualizedStartRow;
      const firstIndex = virtualItems[0].index;
      const lastIndex = virtualItems[virtualItems.length - 1].index;
      if (index < firstIndex || index > lastIndex) {
        row = virtualizedStartRow + firstIndex;
      }
    }
    return { row, col: clamp(tabStop.col, 1, colCount) };
  }, [tabStop, firstRow, lastRow, virtualizedStartRow, virtualItems, colCount]);

  const focusCell = useCallback(
    (position: GridPosition) => {
      const findCell = () =>
        scrollRef.current?.querySelector<HTMLElement>(
          `[role="row"][aria-rowindex="${position.row}"] [aria-colindex="${position.col}"]`
        );
      const cell = findCell();
      if (cell) {
        cell.focus();
        return;
      }
      // The row is virtualized out, scroll it into view and focus it once it is rendered.
      const index = position.row - virtualizedStartRow;
      if (index < 0 || index >= virtualizedRowCount) {
        return;
      }
      scrollToVirtualizedRow(index);
      let attempts = FOCUS_RENDER_ATTEMPTS;
      const focusWhenRendered = () => {
        const renderedCell = findCell();
        if (renderedCell) {
          renderedCell.focus();
        } else if (--attempts > 0) {
          requestAnimationFrame(focusWhenRendered);
        }
      };
      requestAnimationFrame(focusWhenRendered);
    },
    [scrollRef, virtualizedStartRow, virtualizedRowCount, scrollToVirtualizedRow]
  );

  const onFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    const position = getGridPosition(event.target);
    if (position) {
      setTabStop((prev) =>
        prev.row === position.row && prev.col === position.col ? prev : position
      );
    }
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      // Also for content inside a cell, e.g. a focused cell action or the expansion popover.
      if (GRID_KEYS.has(event.key)) {
        event.stopPropagation();
      }
      // Only navigate while a cell or header itself is focused, not content inside of it.
      if (!(event.target instanceof Element) || !event.target.matches(GRID_CELL_SELECTOR)) {
        return;
      }
      const position = getGridPosition(event.target);
      const nextPosition =
        position && getNextGridPosition(position, event, { firstRow, lastRow, colCount });
      if (nextPosition) {
        event.preventDefault();
        event.stopPropagation();
        focusCell(nextPosition);
      }
    },
    [firstRow, lastRow, colCount, focusCell]
  );

  /** Column index (1-based) of the tab stop if it is in the row, to pass to the row. */
  const getTabStopColIndex = useCallback(
    (ariaRowIndex: number) =>
      effectiveTabStop.row === ariaRowIndex ? effectiveTabStop.col : undefined,
    [effectiveTabStop]
  );

  return { ariaRowIndexOffset, getTabStopColIndex, onFocus, onKeyDown };
};
