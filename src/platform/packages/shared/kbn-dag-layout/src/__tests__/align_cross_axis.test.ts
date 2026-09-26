/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DagPositionedNode } from '../types';
import { separatePositionedOverlapsInPlace } from '../align_cross_axis';

// Helper: build a minimal DagPositionedNode at a given cross-axis position (x for TB layout).
const pinNode = (id: string, x: number, w = 100, pinned = false): DagPositionedNode => ({
  id,
  x,
  y: 0,
  width: w,
  height: 50,
  crossPinned: pinned ? (true as const) : undefined,
});

/**
 * Cycle A — PAVA over-relaxation.
 *
 * Scenario: three pinned nodes (indices 1, 3, 7 in the sorted cross-axis order)
 * where nodes at indices 1 and 3 form an infeasible gap (they overlap), but
 * node 7 is completely independent and satisfiable.
 *
 * Expected: the retry correctly demotes only the *conflicting* pin (index 3,
 * the later of the overlapping pair), leaving pin 7 intact.
 *
 * Bug: the current code calls `Math.max(...activePins)` and demotes pin 7 first
 * — the highest-indexed pin, not the conflicting one — so `relaxedPinIds` will
 * contain node 7 instead of node 3.
 */
describe('separatePositionedOverlapsInPlace — PAVA pin demotion (Cycle A)', () => {
  it('demotes only the later conflicting pin, not the highest-indexed satisfiable pin', () => {
    const nodeSep = 10;
    const nodeWidth = 100;

    // Arrange: 9 nodes in a row on the same main-axis rank (y=0 for all).
    // nodeSep=10, nodeWidth=100: minimum gap between centers = (100+100)/2 + 10 = 110.
    //
    // The "shifted" PAVA space subtracts prefix[i] = i*110 from each center.
    // For pin 7 to be independently satisfiable from pin 1, its shifted value
    // must exceed pin 1's shifted value:
    //   shifted[7] = center(n7) - 7*110 > center(n1) - 1*110
    //   center(n7) > 170 + 6*110 = 830  →  x(n7) > 780
    //
    // Layout:
    //   index 0: x=0   (free)            center=50,  shifted=50
    //   index 1: x=120 (pinned)          center=170, shifted=60  ← pin
    //   index 2: x=240 (free)            center=290, shifted=70
    //   index 3: x=250 (pinned)          center=300, shifted=-30 ← pin, CONFLICTS with pin 1
    //   index 4: x=380 (free)            center=430, shifted=-10
    //   index 5: x=500 (free)            center=550, shifted=0
    //   index 6: x=620 (free)            center=670, shifted=10
    //   index 7: x=800 (pinned)          center=850, shifted=80  ← pin, INDEPENDENT (80 > 60)
    //   index 8: x=960 (free)            center=1010, shifted=130

    const nodes: DagPositionedNode[] = [
      pinNode('n0', 0),
      pinNode('n1', 120, nodeWidth, true), // pin at index 1
      pinNode('n2', 240),
      pinNode('n3', 250, nodeWidth, true), // pin at index 3 — overlaps n2, conflicts pin 1
      pinNode('n4', 380),
      pinNode('n5', 500),
      pinNode('n6', 620),
      pinNode('n7', 800, nodeWidth, true), // pin at index 7 — shifted=80 > 60, independent
      pinNode('n8', 960),
    ];

    const mutableNodes = [...nodes];
    const { relaxedPinIds } = separatePositionedOverlapsInPlace(mutableNodes, 'x', nodeSep);

    // Pin 7 (n7) must NOT be relaxed — it is independently satisfiable.
    expect(relaxedPinIds).not.toContain('n7');

    // Exactly one conflicting pin should be relaxed (index 3 is later than index 1).
    expect(relaxedPinIds).toContain('n3');

    // The output must be overlap-free.
    for (let i = 0; i < mutableNodes.length - 1; i++) {
      const a = mutableNodes[i];
      const b = mutableNodes[i + 1];
      const gap = b.x - (a.x + a.width);
      expect(gap).toBeGreaterThanOrEqual(nodeSep - 0.001);
    }
  });

  /**
   * Cycle E — barycentre no-op claim (colour unknown until first run).
   *
   * ADR-0012 (pending) states: "For symmetric chains where dagre already aligns
   * parent and child, both behaviours are no-ops."
   *
   * This test pins that claim so we know whether the unconditional barycentre
   * change (handleSingleParent → handleSingleChild direction inversion) has any
   * blast radius on consumers that pass no reservedLanes.
   *
   * If this test passes: the claim holds, blast radius is nil.
   * If this test fails: the claim is false; stop and report — decision 2 reopens.
   */
  describe('alignDagreCrossAxisInPlace — barycentre no-op claim (Cycle E)', () => {
    it('does not move a symmetric single-parent/single-child chain (equal widths)', () => {
      // Import applyDagre to test barycentre end-to-end without reserved lanes.
      // applyDagre calls alignDagreCrossAxisInPlace internally.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { applyDagre } = require('../apply_dagre');

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
      const { nodes: laid } = applyDagre(nodes, edges, 'TB', 50, 70);
      const centreOf = (id: string) => {
        const n = laid.find((x: { id: string }) => x.id === id);
        if (!n) throw new Error(`Node ${id} not found`);
        return n.x + n.width / 2;
      };
      // All three must share the same cross-axis centre.
      expect(centreOf('b')).toBeCloseTo(centreOf('a'), 1);
      expect(centreOf('c')).toBeCloseTo(centreOf('a'), 1);
    });

    it('centres the parent over its only child when widths differ', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { applyDagre } = require('../apply_dagre');

      const nodes = [
        { id: 'a', width: 300, height: 50 }, // wide parent
        { id: 'b', width: 80, height: 50 }, // narrow child
      ];
      const edges = [{ id: 'ab', source: 'a', target: 'b' }];
      const { nodes: laid } = applyDagre(nodes, edges, 'TB', 50, 70);
      const centre = (id: string) => {
        const n = laid.find((x: { id: string }) => x.id === id);
        if (!n) throw new Error(`Node ${id} not found`);
        return n.x + n.width / 2;
      };
      // Parent should be centred over its only child (ADR-0012 barycentre rule).
      expect(centre('a')).toBeCloseTo(centre('b'), 1);
    });
  });
});

describe('separatePositionedOverlapsInPlace — nested container sweep membership', () => {
  // Regression for the bug where the transitive descendant closure was passed as
  // groupMemberIds, causing PAVA to treat a nested container's body nodes as peers
  // of the nested container and separate them — pushing the body outside its frame.
  //
  // Correct behaviour: only DIRECT members participate in a group's inner sweep.
  // Transitive descendants are used only for outer-node exclusion and carry-on-move.

  const node = (id: string, x: number, y: number, w: number, h: number): DagPositionedNode => ({
    id,
    x,
    y,
    width: w,
    height: h,
  });

  it('does not push nested-container body nodes outside their container', () => {
    const nodeSep = 10;

    // Layout:
    //
    //  outer-group (x=0, w=400)
    //    inner-group (x=10, w=180)
    //      body-a (x=20, w=80)   ← inner-group's body, overlaps inner-group by design
    //      body-b (x=110, w=80)
    //    right-node (x=220, w=80) ← direct member of outer-group, sibling of inner-group
    //
    // With the transitive closure as sweep membership, PAVA would see
    // [inner-group, body-a, body-b, right-node] as peers and try to separate them,
    // pushing body-a or body-b outside inner-group.
    //
    // With direct membership, PAVA only sees [inner-group, right-node] as outer-group
    // peers and [body-a, body-b] as inner-group peers — body-* never compete with
    // right-node.

    const nodes = [
      node('outer-group', 0, 0, 400, 200),
      node('inner-group', 10, 50, 180, 100),
      node('body-a', 20, 80, 80, 40),
      node('body-b', 110, 80, 80, 40),
      node('right-node', 220, 50, 80, 100),
    ];

    // Direct members: outer-group contains inner-group and right-node.
    // inner-group contains body-a and body-b.
    const directMembers = new Map<string, ReadonlySet<string>>([
      ['outer-group', new Set(['inner-group', 'right-node'])],
      ['inner-group', new Set(['body-a', 'body-b'])],
    ]);

    // Transitive descendants: outer-group descends into inner-group's body too.
    const transitiveClosure = new Map<string, ReadonlySet<string>>([
      ['outer-group', new Set(['inner-group', 'right-node', 'body-a', 'body-b'])],
      ['inner-group', new Set(['body-a', 'body-b'])],
    ]);

    const mutableNodes = nodes.map((n) => ({ ...n }));
    separatePositionedOverlapsInPlace(mutableNodes, 'x', nodeSep, directMembers, transitiveClosure);

    // body-a must remain inside inner-group (x >= inner-group.x, x+w <= inner-group.x + inner-group.w).
    const innerGroup = mutableNodes.find((n) => n.id === 'inner-group')!;
    const bodyA = mutableNodes.find((n) => n.id === 'body-a')!;
    const bodyB = mutableNodes.find((n) => n.id === 'body-b')!;

    expect(bodyA.x).toBeGreaterThanOrEqual(innerGroup.x - 0.001);
    expect(bodyA.x + bodyA.width).toBeLessThanOrEqual(innerGroup.x + innerGroup.width + 0.001);
    expect(bodyB.x).toBeGreaterThanOrEqual(innerGroup.x - 0.001);
    expect(bodyB.x + bodyB.width).toBeLessThanOrEqual(innerGroup.x + innerGroup.width + 0.001);
  });
});
