/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { ActivePanelEvent } from '../../panel';
import { getDragOrder } from './get_drag_order';
import { getFlowRects } from './get_flow_rects';

const gutterSize = 16;
const rowHeight = 100;

const getRects = (panels: Array<{ id: string; width: number; grow?: boolean }>) => {
  const layoutElement = document.createElement('div');
  jest.spyOn(layoutElement, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 1000,
    width: 1000,
    height: 0,
    toJSON: () => ({}),
  });

  return (
    getFlowRects({
      gridLayout$: new BehaviorSubject(
        Object.fromEntries(
          panels.map(({ id, width, grow = false }, order) => [id, { id, order, width, grow }])
        )
      ),
      gridSettings$: new BehaviorSubject({ gutterSize, rowHeight, keyboardDragTopLimit: 0 }),
      activePanelEvent$: new BehaviorSubject<ActivePanelEvent | undefined>(undefined),
      layoutRef: { current: layoutElement },
    }) ?? {}
  );
};

describe('getFlowRects', () => {
  it('wraps mixed-width panels onto new rows', () => {
    const rects = getRects([
      { id: 'A', width: 800 },
      { id: 'B', width: 224 },
      { id: 'C', width: 224 },
      { id: 'D', width: 224 },
    ]);
    expect(rects.A).toEqual({ top: 16, bottom: 116, left: 16, right: 816 });
    expect(rects.B).toEqual({ top: 132, bottom: 232, left: 16, right: 240 });
    expect(rects.D).toEqual({ top: 132, bottom: 232, left: 496, right: 720 });
  });

  it('shares leftover row space between growing panels', () => {
    const rects = getRects([
      { id: 'A', width: 400, grow: true },
      { id: 'B', width: 400, grow: true },
    ]);
    expect(rects.A.right - rects.A.left).toBe(476);
    expect(rects.B.right - rects.B.left).toBe(476);
  });
});

describe('getDragOrder with mixed-width wrapping', () => {
  // the dragged panel is A (800px); the siblings keep their relative order for the whole drag
  const siblings = getRects([
    { id: 'B', width: 224 },
    { id: 'C', width: 224 },
    { id: 'D', width: 224 },
  ]);

  const getOrder = (centerX: number, centerY: number) =>
    getDragOrder({
      activeId: 'A',
      previewRect: {
        left: centerX - 400,
        right: centerX + 400,
        top: centerY - 50,
        bottom: centerY + 50,
      },
      otherPanelRects: siblings,
    }).join('');

  it('does not alternate between orders on small pointer movements', () => {
    // sweep across the boundary between C and D (in 1px steps), below the panels
    const orders: string[] = [];
    for (let centerX = 440; centerX <= 520; centerX++) {
      orders.push(getOrder(centerX, 400));
    }
    const changes = orders.filter((order, i) => i > 0 && order !== orders[i - 1]);
    expect(changes.length).toBeLessThanOrEqual(1);
  });

  it('depends only on the pointer position, not on the previous order', () => {
    const first = getOrder(480, 400);
    getOrder(300, 400);
    getOrder(700, 400);
    expect(getOrder(480, 400)).toBe(first);
  });
});
