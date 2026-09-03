/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDisplayPositions, getDropDestinationIndex, type ControlRect } from './drag_reflow';

/** Four 100x40 controls with a 10px gap, all on one row. */
const singleRow: ControlRect[] = [
  { left: 0, top: 0, width: 100, height: 40 },
  { left: 110, top: 0, width: 100, height: 40 },
  { left: 220, top: 0, width: 100, height: 40 },
  { left: 330, top: 0, width: 100, height: 40 },
];

/** Four 100x40 controls wrapped onto two rows of two. */
const twoRows: ControlRect[] = [
  { left: 0, top: 0, width: 100, height: 40 },
  { left: 110, top: 0, width: 100, height: 40 },
  { left: 0, top: 40, width: 100, height: 40 },
  { left: 110, top: 40, width: 100, height: 40 },
];

/**
 * Four controls on one row and a wider fifth wrapped onto a second, measured from a dashboard. The
 * wrapped control is wide enough that its centre is only 35px from the first control's centre,
 * despite being a row below and four places away in the order.
 */
const wrapped: ControlRect[] = [
  { left: 8, top: 144, width: 330, height: 32 },
  { left: 346, top: 144, width: 330, height: 32 },
  { left: 683, top: 144, width: 330, height: 32 },
  { left: 1021, top: 144, width: 400, height: 32 },
  { left: 8, top: 184, width: 400, height: 32 },
];

/** Dragging the first wrapped-layout control, held by its handle. */
const dragWrappedFirstControlTo = (x: number, y: number) =>
  getDropDestinationIndex({
    rects: wrapped,
    startIndex: 0,
    grabOffset: { x: 48, y: 16 },
    pointer: { x, y },
  });

describe('getDropDestinationIndex', () => {
  /** Dragging the first control, held 10px in from its left edge — roughly where its handle is. */
  const dragFirstControlTo = (x: number, y = 20) =>
    getDropDestinationIndex({
      rects: singleRow,
      startIndex: 0,
      grabOffset: { x: 10, y: 20 },
      pointer: { x, y },
    });

  it('keeps the control in place until it has travelled half a slot', () => {
    expect(dragFirstControlTo(10)).toBe(0);
    expect(dragFirstControlTo(60)).toBe(0);
  });

  it('takes the next slot once the control is closer to it than to its own', () => {
    // The pointer is still within the first control's slot, which spans 0 to 100: the control
    // changes places as soon as most of it is over the next slot, not once the pointer gets there
    expect(dragFirstControlTo(70)).toBe(1);
  });

  it('measures the control rather than the pointer', () => {
    // The same pointer position, but holding the control by its right-hand end instead, leaves
    // most of the control behind the pointer and so still over its original slot
    expect(
      getDropDestinationIndex({
        rects: singleRow,
        startIndex: 0,
        grabOffset: { x: 90, y: 20 },
        pointer: { x: 70, y: 20 },
      })
    ).toBe(0);
  });

  it('picks up slots on other rows when the group wraps', () => {
    expect(
      getDropDestinationIndex({
        rects: twoRows,
        startIndex: 0,
        grabOffset: { x: 10, y: 20 },
        pointer: { x: 120, y: 60 },
      })
    ).toBe(3);
  });

  it('keeps a control on its own row while it is still over it', () => {
    // Nudging the first control sideways must not fling it to the far end of the group just
    // because the wrapped control on the row below happens to be centred nearby
    [56, 70, 90, 110, 130].forEach((x) => {
      expect(dragWrappedFirstControlTo(x, 160)).toBe(0);
    });
  });

  it('reaches the row below once the control is actually over it', () => {
    expect(dragWrappedFirstControlTo(56, 200)).toBe(4);
  });

  it('leaves the order alone when the control is clear of every slot', () => {
    expect(dragWrappedFirstControlTo(56, 400)).toBe(0);
  });

  it('stays put on measurements that no longer match the controls', () => {
    expect(
      getDropDestinationIndex({
        rects: singleRow,
        startIndex: 7,
        grabOffset: { x: 10, y: 20 },
        pointer: { x: 200, y: 20 },
      })
    ).toBe(7);
  });
});

describe('getDisplayPositions', () => {
  it('moves the controls a forward-moving control passes back one place', () => {
    expect(getDisplayPositions({ count: 4, startIndex: 0, destinationIndex: 2 })).toEqual([
      2, 0, 1, 3,
    ]);
  });

  it('moves the controls a backward-moving control passes forward one place', () => {
    expect(getDisplayPositions({ count: 4, startIndex: 3, destinationIndex: 1 })).toEqual([
      0, 2, 3, 1,
    ]);
  });

  it('leaves every control where it is when the destination is where the control already is', () => {
    expect(getDisplayPositions({ count: 4, startIndex: 2, destinationIndex: 2 })).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it('gives the dragged control the place the reorder lands it in', () => {
    // The dragged control is hidden, so its own place is never seen — but it has to agree with
    // where the drop lands it, otherwise the gap opens up in the wrong place
    expect(getDisplayPositions({ count: 4, startIndex: 1, destinationIndex: 3 })[1]).toBe(3);
  });

  it('gives every control exactly one place', () => {
    const positions = getDisplayPositions({ count: 5, startIndex: 4, destinationIndex: 0 });

    expect([...positions].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('does not rearrange on indices that no longer match the controls', () => {
    // A control added or removed mid-drag leaves the indices stale, and rearranging on them would
    // shuffle controls into places that no longer exist
    expect(getDisplayPositions({ count: 4, startIndex: 0, destinationIndex: 7 })).toEqual([
      0, 1, 2, 3,
    ]);
    expect(getDisplayPositions({ count: 4, startIndex: -1, destinationIndex: 2 })).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it('returns no places for an empty group', () => {
    expect(getDisplayPositions({ count: 0, startIndex: 0, destinationIndex: 0 })).toEqual([]);
  });
});
