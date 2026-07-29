/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_PINNED_CONTROL_STATE } from '@kbn/controls-constants';

import type { ControlsLayout } from '../types';
import { moveControlByStep, reorderControlsByEdge } from './drag_drop_reorder';

type Controls = ControlsLayout['controls'];

/** Builds a `controls` record from an ordered list of ids, assigning `order` by position. */
const buildControls = (ids: string[]): Controls =>
  ids.reduce<Controls>((acc, id, order) => {
    acc[id] = { ...DEFAULT_PINNED_CONTROL_STATE, type: 'optionsListControl', order };
    return acc;
  }, {});

/** Returns the ids of a `controls` record sorted by their `order`. */
const orderedIds = (controls: Controls): string[] =>
  Object.entries(controls)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([id]) => id);

describe('reorderControlsByEdge', () => {
  it('moves a control forward and drops it after the target on the "right" edge', () => {
    const result = reorderControlsByEdge({
      controls: buildControls(['a', 'b', 'c', 'd']),
      sourceId: 'a',
      targetId: 'c',
      closestEdge: 'right',
    });
    expect(result).not.toBeNull();
    expect(orderedIds(result!)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves a control forward and drops it before the target on the "left" edge', () => {
    const result = reorderControlsByEdge({
      controls: buildControls(['a', 'b', 'c', 'd']),
      sourceId: 'a',
      targetId: 'c',
      closestEdge: 'left',
    });
    expect(orderedIds(result!)).toEqual(['b', 'a', 'c', 'd']);
  });

  it('moves a control backward and drops it before the target on the "left" edge', () => {
    const result = reorderControlsByEdge({
      controls: buildControls(['a', 'b', 'c', 'd']),
      sourceId: 'd',
      targetId: 'b',
      closestEdge: 'left',
    });
    expect(orderedIds(result!)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('moves a control backward and drops it after the target on the "right" edge', () => {
    const result = reorderControlsByEdge({
      controls: buildControls(['a', 'b', 'c', 'd']),
      sourceId: 'd',
      targetId: 'b',
      closestEdge: 'right',
    });
    expect(orderedIds(result!)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('drops onto the target index when the edge is null', () => {
    const result = reorderControlsByEdge({
      controls: buildControls(['a', 'b', 'c', 'd']),
      sourceId: 'a',
      targetId: 'c',
      closestEdge: null,
    });
    expect(orderedIds(result!)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('recomputes sequential `order` values on the returned controls', () => {
    const result = reorderControlsByEdge({
      controls: buildControls(['a', 'b', 'c', 'd']),
      sourceId: 'a',
      targetId: 'c',
      closestEdge: 'right',
    });
    expect(result).toEqual({
      b: expect.objectContaining({ order: 0 }),
      c: expect.objectContaining({ order: 1 }),
      a: expect.objectContaining({ order: 2 }),
      d: expect.objectContaining({ order: 3 }),
    });
  });

  it('returns null when the source is dropped on itself', () => {
    const result = reorderControlsByEdge({
      controls: buildControls(['a', 'b', 'c']),
      sourceId: 'b',
      targetId: 'b',
      closestEdge: 'left',
    });
    expect(result).toBeNull();
  });

  it('returns null when the drop does not change the order', () => {
    // Dragging `a` before `b` leaves `a` in place.
    const result = reorderControlsByEdge({
      controls: buildControls(['a', 'b', 'c']),
      sourceId: 'a',
      targetId: 'b',
      closestEdge: 'left',
    });
    expect(result).toBeNull();
  });

  it('returns null when an id is unknown', () => {
    const controls = buildControls(['a', 'b', 'c']);
    expect(
      reorderControlsByEdge({ controls, sourceId: 'missing', targetId: 'b', closestEdge: 'left' })
    ).toBeNull();
    expect(
      reorderControlsByEdge({ controls, sourceId: 'a', targetId: 'missing', closestEdge: 'left' })
    ).toBeNull();
  });
});

describe('moveControlByStep', () => {
  it('moves a control forward by one position', () => {
    const result = moveControlByStep({
      controls: buildControls(['a', 'b', 'c', 'd']),
      id: 'a',
      offset: 1,
    });
    expect(result).not.toBeNull();
    expect(orderedIds(result!.controls)).toEqual(['b', 'a', 'c', 'd']);
    expect(result!.position).toBe(1);
    expect(result!.total).toBe(4);
  });

  it('moves a control backward by one position', () => {
    const result = moveControlByStep({
      controls: buildControls(['a', 'b', 'c', 'd']),
      id: 'c',
      offset: -1,
    });
    expect(orderedIds(result!.controls)).toEqual(['a', 'c', 'b', 'd']);
    expect(result!.position).toBe(1);
  });

  it('recomputes sequential `order` values on the returned controls', () => {
    const result = moveControlByStep({
      controls: buildControls(['a', 'b', 'c']),
      id: 'a',
      offset: 1,
    });
    expect(result!.controls).toEqual({
      b: expect.objectContaining({ order: 0 }),
      a: expect.objectContaining({ order: 1 }),
      c: expect.objectContaining({ order: 2 }),
    });
  });

  it('returns null at the start boundary', () => {
    const result = moveControlByStep({
      controls: buildControls(['a', 'b', 'c']),
      id: 'a',
      offset: -1,
    });
    expect(result).toBeNull();
  });

  it('returns null at the end boundary', () => {
    const result = moveControlByStep({
      controls: buildControls(['a', 'b', 'c']),
      id: 'c',
      offset: 1,
    });
    expect(result).toBeNull();
  });

  it('returns null when the id is unknown', () => {
    const result = moveControlByStep({
      controls: buildControls(['a', 'b', 'c']),
      id: 'missing',
      offset: 1,
    });
    expect(result).toBeNull();
  });
});
