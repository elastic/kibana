/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import { alignDagreCrossAxisInPlace } from '../align_cross_axis';
import { applyDagre } from '../apply_dagre';

/**
 * Barycentre no-op claim.
 *
 * ADR-0012 states: "For symmetric chains where dagre already aligns parent and
 * child, both behaviours are no-ops." This pins that claim end to end through
 * `applyDagre`, which calls `alignDagreCrossAxisInPlace` internally.
 */
describe('alignDagreCrossAxisInPlace — barycentre no-op claim (Cycle E)', () => {
  it('does not move a symmetric single-parent/single-child chain (equal widths)', () => {
    const W = 100;
    const H = 50;
    // a → b → c, all equal widths. Dagre should centre them already.
    const nodes = [
      { id: 'a', width: W, height: H },
      { id: 'b', width: W, height: H },
      { id: 'c', width: W, height: H },
    ];
    const edges = [
      { id: 'ab', source: 'a', target: 'b' },
      { id: 'bc', source: 'b', target: 'c' },
    ];
    const laid = applyDagre(nodes, edges, 'TB', 50, 70);
    const centreOf = (id: string) => {
      const n = laid.find((x) => x.id === id);
      if (!n) throw new Error(`Node ${id} not found`);
      return n.x + n.width / 2;
    };
    // All three must share the same cross-axis centre.
    expect(centreOf('b')).toBeCloseTo(centreOf('a'), 1);
    expect(centreOf('c')).toBeCloseTo(centreOf('a'), 1);
  });

  it('centres the parent over its only child when widths differ', () => {
    const nodes = [
      { id: 'a', width: 300, height: 50 }, // wide parent
      { id: 'b', width: 80, height: 50 }, // narrow child
    ];
    const edges = [{ id: 'ab', source: 'a', target: 'b' }];
    const laid = applyDagre(nodes, edges, 'TB', 50, 70);
    const centre = (id: string) => {
      const n = laid.find((x) => x.id === id);
      if (!n) throw new Error(`Node ${id} not found`);
      return n.x + n.width / 2;
    };
    // Parent should be centred over its only child (ADR-0012 barycentre rule).
    expect(centre('a')).toBeCloseTo(centre('b'), 1);
  });
});

describe('alignDagreCrossAxisInPlace — topological sort', () => {
  it('handles a chain far longer than the call stack depth', () => {
    // Built directly on a graphlib graph: dagre's own ranking recurses and would
    // overflow first if the chain went through applyDagre.
    const count = 50000;
    const g = new graphlib.Graph();
    for (let i = 0; i < count; i++) {
      g.setNode(`n${i}`, { x: 0, y: i * 100, width: 100, height: 50 });
    }
    for (let i = 0; i < count - 1; i++) {
      g.setEdge(`n${i}`, `n${i + 1}`, {});
    }
    expect(() => alignDagreCrossAxisInPlace(g, 'x', 50)).not.toThrow();
  });

  it('throws a descriptive error naming a node on the cycle', () => {
    const g = new graphlib.Graph();
    for (const id of ['a', 'b', 'c']) g.setNode(id, { x: 0, y: 0, width: 100, height: 50 });
    g.setEdge('a', 'b', {});
    g.setEdge('b', 'c', {});
    g.setEdge('c', 'b', {});
    expect(() => alignDagreCrossAxisInPlace(g, 'x', 50)).toThrow(/cycle.*"[bc]"/i);
  });
});
