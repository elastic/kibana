/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { keys } from '@elastic/eui';

/** 1-based position of a cell, matching its `aria-rowindex` and `aria-colindex`. */
export interface GridPosition {
  row: number;
  col: number;
}

export interface GridBounds {
  firstRow: number;
  lastRow: number;
  colCount: number;
  /** Number of rows to move for PageUp and PageDown, they are ignored when it is not set. */
  pageSize?: number;
}

export const GRID_CELL_SELECTOR = '[role="gridcell"], [role="columnheader"]';

/** Keys that are handled by the grid while one of its cells is focused. */
export const GRID_KEYS: ReadonlySet<string> = new Set<string>([
  keys.ARROW_LEFT,
  keys.ARROW_RIGHT,
  keys.ARROW_UP,
  keys.ARROW_DOWN,
  keys.ESCAPE,
]);

/** Resolves the grid position of the cell (or header) that contains the given element. */
export const getGridPosition = (element: EventTarget | null): GridPosition | undefined => {
  if (!(element instanceof Element)) {
    return undefined;
  }
  const cell = element.closest(GRID_CELL_SELECTOR);
  const col = Number(cell?.getAttribute('aria-colindex'));
  const row = Number(cell?.closest('[role="row"]')?.getAttribute('aria-rowindex'));
  return col > 0 && row > 0 ? { row, col } : undefined;
};

/** Maps arrow, Page, Home and End keys (with Ctrl for the grid corners) to the next cell position. */
export const getNextGridPosition = (
  { row, col }: GridPosition,
  { key, ctrlKey, altKey = false }: { key: string; ctrlKey: boolean; altKey?: boolean },
  { firstRow, lastRow, colCount, pageSize }: GridBounds
): GridPosition | undefined => {
  // Alt combinations are left to the cells, e.g. for resizing a column.
  if (altKey) {
    return undefined;
  }
  switch (key) {
    case keys.PAGE_UP:
      return pageSize ? { row: Math.max(row - pageSize, firstRow), col } : undefined;
    case keys.PAGE_DOWN:
      return pageSize ? { row: Math.min(row + pageSize, lastRow), col } : undefined;
    case keys.ARROW_UP:
      return { row: Math.max(row - 1, firstRow), col };
    case keys.ARROW_DOWN:
      return { row: Math.min(row + 1, lastRow), col };
    case keys.ARROW_LEFT:
      return { row, col: Math.max(col - 1, 1) };
    case keys.ARROW_RIGHT:
      return { row, col: Math.min(col + 1, colCount) };
    case keys.HOME:
      return ctrlKey ? { row: firstRow, col: 1 } : { row, col: 1 };
    case keys.END:
      return ctrlKey ? { row: lastRow, col: colCount } : { row, col: colCount };
    default:
      return undefined;
  }
};
