/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computeMoves } from './compute_moves';

describe('computeMoves', () => {
  it('returns empty array when user order matches default', () => {
    const order = ['a', 'b', 'c'];
    expect(computeMoves(order, order)).toEqual([]);
  });

  it('records a move when an item changes predecessor', () => {
    // default: [a, b, c] → user moves c to front → [c, a, b]
    const moves = computeMoves(['a', 'b', 'c'], ['c', 'a', 'b']);
    expect(moves).toEqual([{ id: 'c', afterId: null }]);
  });

  it('records a move to front (afterId: null)', () => {
    const moves = computeMoves(['a', 'b', 'c', 'd'], ['d', 'a', 'b', 'c']);
    expect(moves).toEqual([{ id: 'd', afterId: null }]);
  });

  it('records minimal moves — only displaced items', () => {
    // default: [a, b, c, d] → user swaps b and c → [a, c, b, d]
    // c moves after a, b moves after c — both predecessors changed
    const moves = computeMoves(['a', 'b', 'c', 'd'], ['a', 'c', 'b', 'd']);
    expect(moves).toHaveLength(2);
    expect(moves).toContainEqual({ id: 'c', afterId: 'a' });
    expect(moves).toContainEqual({ id: 'b', afterId: 'c' });
  });

  it('does not record a move when only unmoved items surround it (still same predecessor)', () => {
    // default: [a, b, c, d] → user order: [a, b, c, d] — no change
    expect(computeMoves(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd'])).toEqual([]);
  });

  it('handles items in user order that are absent from default (new items)', () => {
    // 'x' is not in defaultOrder — it has no defaultAfterId (indexOf = -1 → defaultAfterId = null)
    // if userOrder has x at position 1 (after 'a'), afterId='a' ≠ null → move recorded
    const moves = computeMoves(['a', 'b', 'c'], ['a', 'x', 'b', 'c']);
    expect(moves).toContainEqual({ id: 'x', afterId: 'a' });
  });

  it('handles items absent from user order (removed items) gracefully — no error', () => {
    // 'b' removed from userOrder — computeMoves only iterates userOrder so no issue
    const moves = computeMoves(['a', 'b', 'c'], ['a', 'c']);
    // 'c' now follows 'a' directly; default predecessor was 'b' → move recorded
    expect(moves).toEqual([{ id: 'c', afterId: 'a' }]);
  });

  it('records a single move when one item is moved to the middle', () => {
    // default: [a, b, c, d] → user moves d after a → [a, d, b, c]
    const moves = computeMoves(['a', 'b', 'c', 'd'], ['a', 'd', 'b', 'c']);
    expect(moves).toEqual([{ id: 'd', afterId: 'a' }]);
  });

  it('produces moves that, when replayed, reproduce the user order', () => {
    const defaultOrder = ['discover', 'dashboards', 'ml', 'analytics', 'maps'];
    const userOrder = ['discover', 'maps', 'dashboards', 'ml', 'analytics'];

    const moves = computeMoves(defaultOrder, userOrder);

    // Replay the moves on a copy of the default order
    const result = [...defaultOrder];
    for (const { id, afterId } of moves) {
      const fromIdx = result.indexOf(id);
      result.splice(fromIdx, 1);
      if (afterId === null) {
        result.unshift(id);
      } else {
        const afterIdx = result.indexOf(afterId);
        result.splice(afterIdx + 1, 0, id);
      }
    }

    expect(result).toEqual(userOrder);
  });
});
