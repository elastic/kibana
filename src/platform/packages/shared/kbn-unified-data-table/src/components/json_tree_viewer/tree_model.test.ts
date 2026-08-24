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
  collectExpandableIds,
  getNodeId,
  nodeToJsonValue,
  nodeToJsonString,
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

  it('expands shallow levels before deeper ones (breadth-first)', () => {
    const nodes = buildNodes({ a: { a1: { deep: 1 } }, b: { b1: { deep: 1 } } });

    // The budget fits the two shallow collections; their nested children do not.
    expect(collectExpandableIds(nodes, 2)).toEqual([getNodeId(['a']), getNodeId(['b'])]);
  });
});
