/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KeyboardEvent } from 'react';
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
}

export const GRID_CELL_SELECTOR = '[role="gridcell"], [role="columnheader"]';

// Like EuiDataGrid, keep keys used inside the grid from reaching a parent such as a flyout
// (arrow keys navigate between documents and Escape closes it).
export const GRID_KEYS = new Set<string>([
  keys.ARROW_LEFT,
  keys.ARROW_RIGHT,
  keys.ARROW_UP,
  keys.ARROW_DOWN,
  keys.ESCAPE,
]);

export const getGridPosition = (element: EventTarget | null): GridPosition | undefined => {
  if (!(element instanceof Element)) {
    return undefined;
  }
  const cell = element.closest(GRID_CELL_SELECTOR);
  const col = Number(cell?.getAttribute('aria-colindex'));
  const row = Number(cell?.closest('[role="row"]')?.getAttribute('aria-rowindex'));
  return col > 0 && row > 0 ? { row, col } : undefined;
};

export const getNextGridPosition = (
  { row, col }: GridPosition,
  { key, ctrlKey }: Pick<KeyboardEvent, 'key' | 'ctrlKey'>,
  { firstRow, lastRow, colCount }: GridBounds
): GridPosition | undefined => {
  switch (key) {
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

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);
