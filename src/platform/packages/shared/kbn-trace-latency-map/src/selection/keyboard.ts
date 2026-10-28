/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rangeFromCells } from '../geometry/cell_range';
import type { Cell, CellRange } from '../geometry/cell_range';

/** The cell the keyboard is on, and where a region being extended with Shift started. */
export interface KeyboardState {
  cursor: Cell;
  anchor?: Cell;
}

export type KeyboardAction = { type: 'commit'; range: CellRange } | { type: 'clear' } | undefined;

const ARROWS: Record<string, Cell> = {
  ArrowLeft: { xi: -1, yi: 0 },
  ArrowRight: { xi: 1, yi: 0 },
  ArrowUp: { xi: 0, yi: 1 },
  ArrowDown: { xi: 0, yi: -1 },
};

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));

/** The region the keyboard is making: from its anchor to its cursor, or the cursor's cell. */
export const getKeyboardRange = ({ cursor, anchor }: KeyboardState) =>
  rangeFromCells(anchor ?? cursor, cursor);

/**
 * Arrows move the cursor, Shift+arrows extend a region from where Shift began, Enter commits
 * the region (the cursor's cell when there is none) and Escape drops it, or clears the
 * selection when there is none to drop.
 */
export function reduceKeyboard(
  state: KeyboardState,
  { key, shiftKey }: { key: string; shiftKey: boolean },
  bins: number,
  rows: number
): { state: KeyboardState; action?: KeyboardAction; handled: boolean } {
  const arrow = ARROWS[key];
  if (arrow) {
    const cursor = {
      xi: clamp(state.cursor.xi + arrow.xi, bins - 1),
      yi: clamp(state.cursor.yi + arrow.yi, rows - 1),
    };
    return {
      state: { cursor, anchor: shiftKey ? state.anchor ?? state.cursor : undefined },
      handled: true,
    };
  }
  if (key === 'Enter') {
    return {
      state: { cursor: state.cursor },
      action: { type: 'commit', range: getKeyboardRange(state) },
      handled: true,
    };
  }
  if (key === 'Escape') {
    return {
      state: { cursor: state.cursor },
      action: state.anchor ? undefined : { type: 'clear' },
      handled: true,
    };
  }
  return { state, handled: false };
}
