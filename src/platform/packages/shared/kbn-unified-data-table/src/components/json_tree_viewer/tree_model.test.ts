/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildNodes,
  collectDefaultSeed,
  collectExpandableIds,
  getNodeId,
  nodeToJsonValue,
  nodeToJsonString,
  ROOT_ID,
} from './tree_model';

describe('nodeToJsonValue', () => {
  it('rebuilds a nested object subtree', () => {
    const [node] = buildNodes({
      user: { name: 'Alice', roles: ['admin', 'viewer'], active: true },
    });
    expect(nodeToJsonValue(node)).toEqual({
      name: 'Alice',
      roles: ['admin', 'viewer'],
      active: true,
    });
  });

  it('rebuilds an array subtree, keeping element order and nested shape', () => {
    const [node] = buildNodes({ items: ['alpha', 2, { nested: true }] });
    expect(nodeToJsonValue(node)).toEqual(['alpha', 2, { nested: true }]);
  });

  it('preserves primitive types, including zero, false, and null', () => {
    const [node] = buildNodes({ value: { text: 'hi', count: 0, flag: false, missing: null } });
    expect(nodeToJsonValue(node)).toEqual({ text: 'hi', count: 0, flag: false, missing: null });
  });
});

describe('nodeToJsonString', () => {
  it('pretty-prints the subtree with two-space indentation', () => {
    const [node] = buildNodes({ user: { name: 'Alice' } });
    expect(nodeToJsonString(node)).toBe('{\n  "name": "Alice"\n}');
  });
});

describe('collectExpandableIds', () => {
  it('returns every expandable id for a small tree', () => {
    const nodes = buildNodes({ user: { name: 'Alice', address: { city: 'Berlin' } } });

    expect(collectExpandableIds(nodes)).toEqual([
      getNodeId(['user']),
      getNodeId(['user', 'address']),
    ]);
  });

  it('stops once expanding one more collection would exceed the budget', () => {
    const nodes = buildNodes({ a: { x: 1 }, b: { y: 1 }, c: { z: 1 } });

    expect(collectExpandableIds(nodes, 2)).toEqual([getNodeId(['a']), getNodeId(['b'])]);
  });

  it('counts leaf nodes, not collection headers, against the budget', () => {
    // The only leaves are the two `deep` values; the four collection headers cost nothing.
    const nodes = buildNodes({ a: { a1: { deep: 1 } }, b: { b1: { deep: 1 } } });

    expect(collectExpandableIds(nodes, 2)).toEqual([
      getNodeId(['a']),
      getNodeId(['b']),
      getNodeId(['a', 'a1']),
      getNodeId(['b', 'b1']),
    ]);
  });

  it('skips a collection that overflows the budget but still fits a smaller sibling', () => {
    const nodes = buildNodes({ a: { x: 1, y: 2, z: 3 }, b: { m: 1 } });

    // `a` has 3 leaves and overflows a budget of 1; `b` (1 leaf) still fits.
    expect(collectExpandableIds(nodes, 1)).toEqual([getNodeId(['b'])]);
  });

  it('expands shallow levels before deeper ones (breadth-first)', () => {
    const nodes = buildNodes({ a: { deep: { x: 1 } }, b: { y: 1 } });

    // A 1-leaf budget opens both top-level collections (their headers are free) but leaves the
    // deeper `deep` collection collapsed.
    expect(collectExpandableIds(nodes, 1)).toEqual([getNodeId(['a']), getNodeId(['b'])]);
  });

  it('counts the always-visible top-level leaves against the budget', () => {
    const nodes = buildNodes({ a: 1, b: 2, nested: { x: 1 } });

    // The two top-level leaves already spend a budget of 2, so `nested` stays collapsed.
    expect(collectExpandableIds(nodes, 2)).toEqual([]);
  });
});

describe('collectDefaultSeed', () => {
  it('opens nested collections without lifting any pager for a small document', () => {
    const nodes = buildNodes({ user: { name: 'Alice', address: { city: 'Berlin' } } });

    const { expanded, revealed } = collectDefaultSeed(nodes, 200);

    expect(expanded).toEqual(new Set([getNodeId(['user']), getNodeId(['user', 'address'])]));
    expect(revealed.size).toBe(0); // nothing exceeds the default per-collection window
  });

  it('reveals a large flat list past the default window up to the budget', () => {
    const nodes = buildNodes(Array.from({ length: 30 }, (_, i) => i));

    const { expanded, revealed } = collectDefaultSeed(nodes, 20);

    expect(expanded.size).toBe(0); // a flat array has no nested collections to open
    expect(revealed.get(ROOT_ID)).toBe(20);
  });

  it('expands and reveals array items to reach the budget', () => {
    const nodes = buildNodes(Array.from({ length: 30 }, (_, i) => ({ v: i })));

    const { expanded, revealed } = collectDefaultSeed(nodes, 20);

    // Each object holds one leaf, so ~20 objects open and the root pager lifts to 20.
    expect(expanded.size).toBe(20);
    expect(revealed.get(ROOT_ID)).toBe(20);
  });

  it('opens nothing and keeps the default window at budget 0', () => {
    const nodes = buildNodes(Array.from({ length: 30 }, (_, i) => i));

    const { expanded, revealed } = collectDefaultSeed(nodes, 0);

    expect(expanded.size).toBe(0);
    expect(revealed.size).toBe(0);
  });
});
