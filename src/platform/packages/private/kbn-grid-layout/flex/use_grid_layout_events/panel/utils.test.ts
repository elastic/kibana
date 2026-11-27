/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KeyboardCode } from '../../../common/sensors/keyboard/types';
import type { FlexLayoutStateManager } from '../../types';
import type { ActivePanelEvent } from '../../panel/types';
import { getKeyboardDragPosition, getNextKeyboardResizePosition } from './utils';

// a: [0-200] b: [250-450] c: [500-700]   (row 0)
// d: [0-200] e: [250-450]                (row 1)
const rects: Record<string, { top: number; left: number; right: number }> = {
  a: { top: 0, left: 0, right: 200 },
  b: { top: 0, left: 250, right: 450 },
  c: { top: 0, left: 500, right: 700 },
  d: { top: 150, left: 0, right: 200 },
  e: { top: 150, left: 250, right: 450 },
};
const ids = ['a', 'b', 'c', 'd', 'e'];

const getTarget = (code: string, activeId: string) =>
  getKeyboardDragPosition({
    code,
    ids,
    activeId,
    rowHeight: 100,
    getRect: (id) => rects[id],
  });

describe('getKeyboardDragTargetIndex', () => {
  it('moves one place left or right, stopping at either end', () => {
    expect(getTarget(KeyboardCode.Right, 'b')).toBe(2);
    expect(getTarget(KeyboardCode.Left, 'b')).toBe(0);
    expect(getTarget(KeyboardCode.Left, 'a')).toBe(0);
    expect(getTarget(KeyboardCode.Right, 'e')).toBe(4);
  });

  it('wraps across rows through the order', () => {
    expect(getTarget(KeyboardCode.Right, 'c')).toBe(3);
    expect(getTarget(KeyboardCode.Left, 'd')).toBe(2);
  });

  it('moves down to the closest panel in the next row', () => {
    expect(getTarget(KeyboardCode.Down, 'a')).toBe(3);
    expect(getTarget(KeyboardCode.Down, 'b')).toBe(4);
    expect(getTarget(KeyboardCode.Down, 'c')).toBe(4); // nothing directly below, take the closest
  });

  it('moves up to the closest panel in the previous row', () => {
    expect(getTarget(KeyboardCode.Up, 'd')).toBe(0);
    expect(getTarget(KeyboardCode.Up, 'e')).toBe(1);
  });

  it('stays put when there is no row in that direction', () => {
    expect(getTarget(KeyboardCode.Up, 'b')).toBe(1);
    expect(getTarget(KeyboardCode.Down, 'e')).toBe(4);
  });
});

describe('getNextKeyboardResizePosition', () => {
  const stateManager = {
    gridSettings$: { value: { rowHeight: 100, gutterSize: 10 } },
    layoutRef: { current: { getBoundingClientRect: () => ({ left: 0, width: 1000 }) } },
  } as unknown as FlexLayoutStateManager;
  const activePanel = {
    position: { left: 0, right: 300 },
    sensorOffsets: { right: 0 },
  } as unknown as ActivePanelEvent;
  // the live handle has wrapped onto another row, so its X differs from the stored origin
  const handlePosition = { clientX: 50, clientY: 400 };

  const getPosition = (code: string) =>
    getNextKeyboardResizePosition(
      { code } as Parameters<typeof getNextKeyboardResizePosition>[0],
      stateManager,
      activePanel,
      handlePosition
    );

  it('ignores Up/Down by keeping the requested edge instead of the live handle position', () => {
    expect(getPosition(KeyboardCode.Up).clientX).toBe(300);
    expect(getPosition(KeyboardCode.Down).clientX).toBe(300);
  });

  it('steps left and right from the requested edge', () => {
    expect(getPosition(KeyboardCode.Right).clientX).toBe(410);
    expect(getPosition(KeyboardCode.Left).clientX).toBe(190);
  });
});
