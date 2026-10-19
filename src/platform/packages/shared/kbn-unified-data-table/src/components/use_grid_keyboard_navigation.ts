/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FocusEvent, KeyboardEvent, RefObject } from 'react';
import { useCallback, useState } from 'react';
import {
  GRID_CELL_SELECTOR,
  GRID_KEYS,
  getGridPosition,
  getNextGridPosition,
} from './grid_keyboard_navigation';
import type { GridPosition } from './grid_keyboard_navigation';

/** The rows of a grid by their `aria-rowindex`, in the order keyboard navigation visits them. */
export interface GridNavigationLayout {
  headerRow?: number;
  /** First and last row of the body, which is empty when the last is before the first. */
  firstBodyRow: number;
  lastBodyRow: number;
  footerRow?: number;
}

export interface UseGridKeyboardNavigationParams {
  gridRef: RefObject<HTMLElement | null>;
  layout: GridNavigationLayout;
  colCount: number;
  /** The tab stop until a cell is focused. */
  initialPosition: GridPosition;
  /** Whether a body row is in the DOM, rows can be virtualized out. */
  isBodyRowRendered: (row: number) => boolean;
  /** The body row that is the tab stop when the focused one is not rendered. */
  fallbackBodyRow: number;
  /** Scrolls a body row into view so it gets rendered. */
  scrollToBodyRow: (row: number) => void;
  /** Rows to move for PageUp and PageDown. */
  pageSize?: number;
}

const MAX_FOCUS_ATTEMPTS = 10;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Keyboard navigation for a virtualized grid: the grid is a single tab stop (roving tabindex) and
 * arrow, Page, Home and End keys move between its cells, scrolling rows into view when needed.
 */
export const useGridKeyboardNavigation = ({
  gridRef,
  layout: { headerRow, firstBodyRow, lastBodyRow, footerRow },
  colCount,
  initialPosition,
  isBodyRowRendered,
  fallbackBodyRow,
  scrollToBodyRow,
  pageSize,
}: UseGridKeyboardNavigationParams) => {
  const [tabStop, setTabStop] = useState<GridPosition>(initialPosition);

  const hasHeader = headerRow !== undefined;
  const hasFooter = footerRow !== undefined;
  const bodyRowCount = Math.max(0, lastBodyRow - firstBodyRow + 1);
  const navRowCount = (hasHeader ? 1 : 0) + bodyRowCount + (hasFooter ? 1 : 0);

  // Navigation numbers the rows 1..n, the header first and the footer last, whatever their aria row.
  const toNavRow = useCallback(
    (row: number) => {
      if (row === headerRow) {
        return 1;
      }
      if (row === footerRow) {
        return navRowCount;
      }
      return (hasHeader ? 1 : 0) + row - firstBodyRow + 1;
    },
    [headerRow, footerRow, hasHeader, firstBodyRow, navRowCount]
  );
  const fromNavRow = useCallback(
    (navRow: number) => {
      if (hasHeader && navRow === 1) {
        return headerRow;
      }
      if (hasFooter && navRow === navRowCount) {
        return footerRow;
      }
      return firstBodyRow + navRow - 1 - (hasHeader ? 1 : 0);
    },
    [headerRow, footerRow, hasHeader, hasFooter, firstBodyRow, navRowCount]
  );

  // A row that is gone, on another page or virtualized out cannot be the tab stop.
  const isValidRow =
    tabStop.row === headerRow ||
    tabStop.row === footerRow ||
    (tabStop.row >= firstBodyRow &&
      tabStop.row <= lastBodyRow &&
      isBodyRowRendered(tabStop.row));
  const effectiveTabStop: GridPosition = {
    row: isValidRow ? tabStop.row : fallbackBodyRow,
    col: clamp(tabStop.col, 1, Math.max(colCount, 1)),
  };

  const focusCell = useCallback(
    (position: GridPosition) => {
      const findCell = () =>
        gridRef.current?.querySelector<HTMLElement>(
          `[role="row"][aria-rowindex="${position.row}"] [aria-colindex="${position.col}"]`
        );
      const cell = findCell();
      if (cell) {
        cell.focus();
        return;
      }
      if (position.row < firstBodyRow || position.row > lastBodyRow) {
        return;
      }
      // The row is virtualized out, scroll it into view and focus it once it is rendered.
      scrollToBodyRow(position.row);
      let attempts = MAX_FOCUS_ATTEMPTS;
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
    [gridRef, firstBodyRow, lastBodyRow, scrollToBodyRow]
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
      // Only while a cell or header itself is focused, not for content inside of it.
      if (!(event.target instanceof Element) || !event.target.matches(GRID_CELL_SELECTOR)) {
        return;
      }
      if (GRID_KEYS.has(event.key)) {
        event.stopPropagation();
      }
      const position = getGridPosition(event.target);
      const next =
        position &&
        getNextGridPosition({ ...position, row: toNavRow(position.row) }, event, {
          firstRow: 1,
          lastRow: navRowCount,
          colCount,
          pageSize,
        });
      const nextRow = next && fromNavRow(next.row);
      if (next && nextRow !== undefined) {
        event.preventDefault();
        event.stopPropagation();
        focusCell({ ...next, row: nextRow });
      }
    },
    [toNavRow, fromNavRow, navRowCount, colCount, pageSize, focusCell]
  );

  return { tabStop: effectiveTabStop, onFocus, onKeyDown };
};
