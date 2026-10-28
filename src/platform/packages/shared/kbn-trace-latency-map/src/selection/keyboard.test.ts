/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getKeyboardRange, reduceKeyboard } from './keyboard';
import type { KeyboardState } from './keyboard';

const press = (state: KeyboardState, key: string, shiftKey = false) =>
  reduceKeyboard(state, { key, shiftKey }, 10, 8);

describe('keyboard selection', () => {
  const start: KeyboardState = { cursor: { xi: 3, yi: 3 } };

  it('moves the cursor with the arrows, up being slower, and stops at the edges', () => {
    expect(press(start, 'ArrowRight').state.cursor).toEqual({ xi: 4, yi: 3 });
    expect(press(start, 'ArrowUp').state.cursor).toEqual({ xi: 3, yi: 4 });
    expect(press({ cursor: { xi: 0, yi: 0 } }, 'ArrowLeft').state.cursor).toEqual({ xi: 0, yi: 0 });
    expect(press({ cursor: { xi: 9, yi: 7 } }, 'ArrowUp').state.cursor).toEqual({ xi: 9, yi: 7 });
  });

  it('extends a region from where Shift began', () => {
    const first = press(start, 'ArrowRight', true).state;
    const second = press(first, 'ArrowUp', true).state;
    expect(second.anchor).toEqual({ xi: 3, yi: 3 });
    expect(getKeyboardRange(second)).toEqual({ x0: 3, x1: 5, y0: 3, y1: 5 });
  });

  it('drops the anchor when the arrows come without Shift', () => {
    const extended = press(start, 'ArrowRight', true).state;
    expect(press(extended, 'ArrowRight').state.anchor).toBeUndefined();
  });

  it('commits the region, or the cell the cursor is on', () => {
    expect(press(start, 'Enter').action).toEqual({
      type: 'commit',
      range: { x0: 3, x1: 4, y0: 3, y1: 4 },
    });
    const extended = press(start, 'ArrowRight', true).state;
    expect(press(extended, 'Enter').action).toEqual({
      type: 'commit',
      range: { x0: 3, x1: 5, y0: 3, y1: 4 },
    });
  });

  it('drops a region on Escape, and clears the selection when there is none', () => {
    const extended = press(start, 'ArrowRight', true).state;
    const dropped = press(extended, 'Escape');
    expect(dropped.state.anchor).toBeUndefined();
    expect(dropped.action).toBeUndefined();
    expect(press(start, 'Escape').action).toEqual({ type: 'clear' });
  });

  it('leaves other keys alone', () => {
    expect(press(start, 'Tab').handled).toBe(false);
  });
});
