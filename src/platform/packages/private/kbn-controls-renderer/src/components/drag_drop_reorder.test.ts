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
import { moveControlByStep, reorderControlsToIndex } from './drag_drop_reorder';

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

describe('reorderControlsToIndex', () => {
  it('moves a control forwards', () => {
    const result = reorderControlsToIndex({
      controls: buildControls(['a', 'b', 'c', 'd']),
      sourceId: 'a',
      destinationIndex: 2,
    });
    expect(result).not.toBeNull();
    expect(orderedIds(result!)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves a control backwards', () => {
    const result = reorderControlsToIndex({
      controls: buildControls(['a', 'b', 'c', 'd']),
      sourceId: 'd',
      destinationIndex: 1,
    });
    expect(orderedIds(result!)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('leaves the control at the index it was asked for, for every drop', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const landedElsewhere = ids.flatMap((sourceId) =>
      ids.flatMap((_, destinationIndex) => {
        const result = reorderControlsToIndex({
          controls: buildControls(ids),
          sourceId,
          destinationIndex,
        });
        if (!result) return [];

        const landedAt = orderedIds(result).indexOf(sourceId);
        return landedAt === destinationIndex ? [] : [{ sourceId, destinationIndex, landedAt }];
      })
    );

    expect(landedElsewhere).toEqual([]);
  });

  it('recomputes sequential `order` values on the returned controls', () => {
    const result = reorderControlsToIndex({
      controls: buildControls(['a', 'b', 'c', 'd']),
      sourceId: 'a',
      destinationIndex: 2,
    });
    expect(result).toEqual({
      b: expect.objectContaining({ order: 0 }),
      c: expect.objectContaining({ order: 1 }),
      a: expect.objectContaining({ order: 2 }),
      d: expect.objectContaining({ order: 3 }),
    });
  });

  it('returns null when the control is dropped back where it started', () => {
    const result = reorderControlsToIndex({
      controls: buildControls(['a', 'b', 'c']),
      sourceId: 'b',
      destinationIndex: 1,
    });
    expect(result).toBeNull();
  });

  it('returns null when the destination is out of range', () => {
    const controls = buildControls(['a', 'b', 'c']);
    expect(reorderControlsToIndex({ controls, sourceId: 'a', destinationIndex: -1 })).toBeNull();
    expect(reorderControlsToIndex({ controls, sourceId: 'a', destinationIndex: 3 })).toBeNull();
  });

  it('returns null when the id is unknown', () => {
    expect(
      reorderControlsToIndex({
        controls: buildControls(['a', 'b', 'c']),
        sourceId: 'missing',
        destinationIndex: 1,
      })
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
