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
import type { FlexLayoutStateManager } from '../../types';
import { getPanelKeysInOrder } from '../../utils/panel_order';
import { getDragOrder } from './get_drag_order';
import { getFlowRects } from './get_flow_rects';
import { moveAction, startAction } from './state_manager_actions';

const gutterSize = 16;
const rowHeight = 100;

const getRects = (
  panels: Array<{ id: string; width: number; grow?: boolean }>,
  padding: string = `${gutterSize}px`,
  activePanel?: Partial<ActivePanelEvent>,
  isStacked = false
) => {
  const panelDiv = document.createElement('div');
  if (isStacked) panelDiv.style.flexBasis = '100%';
  const layoutElement = document.createElement('div');
  layoutElement.style.padding = padding;
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
      activePanelEvent$: new BehaviorSubject<ActivePanelEvent | undefined>(
        activePanel && ({ ...activePanel, panelDiv } as ActivePanelEvent)
      ),
      layoutRef: { current: layoutElement },
    }) ?? {}
  );
};

describe('getFlowRects', () => {
  it('uses the rendered container padding rather than the gutter size', () => {
    const rects = getRects(
      [
        { id: 'A', width: 800 },
        { id: 'B', width: 224 },
      ],
      '0 16px'
    );
    expect(rects.A).toEqual({ top: 0, bottom: 100, left: 16, right: 816 });
    expect(rects.B).toEqual({ top: 116, bottom: 216, left: 16, right: 240 });
  });

  const growingPanels = [
    { id: 'A', width: 224 },
    { id: 'G', width: 224, grow: true },
    { id: 'X', width: 224 },
  ];

  it('does not treat a growing panel that filled its row as full-width', () => {
    // G measured the full row because it was alone on its line, but it only requests 224px
    const rects = getRects(growingPanels, undefined, {
      id: 'X',
      panelWidths: { A: 224, G: 968, X: 224 },
    });
    expect(rects.A.top).toBe(rects.G.top);
    expect(rects.G.left).toBeGreaterThan(rects.A.right);
  });

  it('gives panels stacked by the responsive breakpoint a full-row width', () => {
    const rects = getRects(
      growingPanels,
      undefined,
      {
        id: 'X',
        panelWidths: { A: 968, G: 968, X: 968 },
      },
      true
    );
    expect(rects.A.top).toBeLessThan(rects.G.top);
    expect(rects.G.right - rects.G.left).toBe(968);
  });

  it('reserves the dragged panel footprint so the other panels stay at their actual offsets', () => {
    const rects = getRects(
      [
        { id: 'A', width: 224 },
        { id: 'B', width: 224 },
        { id: 'C', width: 224 },
      ],
      undefined,
      { id: 'A' }
    );
    expect(rects.A).toBeUndefined();
    expect(rects.B.left).toBe(16 + 224 + gutterSize);
    expect(rects.C.left).toBe(16 + 2 * (224 + gutterSize));
  });

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

describe('moveAction drag feedback loop', () => {
  const panelWidths = { A: 800, B: 224, C: 224, D: 224 };

  const createStateManager = () => {
    const layoutElement = document.createElement('div');
    layoutElement.style.padding = `${gutterSize}px`;
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

    const gridLayout$ = new BehaviorSubject(
      Object.fromEntries(
        Object.entries(panelWidths).map(([id, width], order) => [
          id,
          { id, order, width, grow: false },
        ])
      )
    );
    const gridSettings$ = new BehaviorSubject({ gutterSize, rowHeight, keyboardDragTopLimit: 0 });
    const panelDiv = document.createElement('div');
    const activePanelEvent$ = new BehaviorSubject<ActivePanelEvent | undefined>({
      type: 'drag',
      id: 'A',
      panelDiv,
      sensorOffsets: { left: 400, right: -400, top: 50, bottom: -50 }, // pointer is at the panel center
      sensorType: 'mouse',
      position: { left: 0, right: 800, top: 16, bottom: 116 },
      panelWidths,
    } as ActivePanelEvent);

    // live DOM rects: like the browser, these include the dragged panel (the placeholder) at its
    // current position in the layout, so they shift every time the order changes
    const panelRefs: FlexLayoutStateManager['panelRefs'] = { current: {} };
    Object.keys(panelWidths).forEach((id) => {
      const element = document.createElement('div');
      jest.spyOn(element, 'getBoundingClientRect').mockImplementation(() => {
        const rect = getFlowRects({
          gridLayout$,
          gridSettings$,
          activePanelEvent$: new BehaviorSubject<ActivePanelEvent | undefined>(undefined),
          layoutRef: { current: layoutElement },
        })?.[id] ?? { top: 0, bottom: 0, left: 0, right: 0 };
        return {
          ...rect,
          x: rect.left,
          y: rect.top,
          ...{ width: 0, height: 0 },
          toJSON: () => ({}),
        };
      });
      panelRefs.current[id] = element;
    });

    return {
      gridLayout$,
      gridSettings$,
      activePanelEvent$,
      layoutRef: { current: layoutElement },
      panelRefs,
    } as unknown as FlexLayoutStateManager;
  };

  // drags A from `fromX` to `toX` in 1px steps, feeding every resulting layout back into the next sample
  const sweep = (fromX: number, toX: number, y: number) => {
    const stateManager = createStateManager();
    // record the starting layout, then restore the event, since the mocked rects can't measure widths
    const dragEvent = stateManager.activePanelEvent$.value;
    startAction(new MouseEvent('mousedown'), 'drag', stateManager, 'A');
    stateManager.activePanelEvent$.next(dragEvent);
    const lastRequestedPanelPosition = { current: undefined };
    const direction = fromX <= toX ? 1 : -1;
    const orders: string[] = [];
    for (let x = fromX; x !== toX + direction; x += direction) {
      moveAction(
        {} as MouseEvent,
        stateManager,
        { clientX: x, clientY: y },
        lastRequestedPanelPosition
      );
      orders.push(getPanelKeysInOrder(stateManager.gridLayout$.value).join(''));
    }
    return orders;
  };

  const countChanges = (orders: string[]) =>
    orders.filter((order, i) => i > 0 && order !== orders[i - 1]).length;

  it('settles on a single order change when sweeping across a slot boundary', () => {
    expect(countChanges(sweep(440, 520, 400))).toBeLessThanOrEqual(1);
    expect(countChanges(sweep(520, 440, 400))).toBeLessThanOrEqual(1);
  });

  it('does not oscillate when the pointer hovers around a boundary', () => {
    const orders = [...sweep(440, 520, 400), ...sweep(520, 440, 400)];
    // forward then back: at most one change each way
    expect(countChanges(orders)).toBeLessThanOrEqual(2);
  });
});
