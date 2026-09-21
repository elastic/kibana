/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dagLayout } from '../dag_layout';
import { resolveShiftedEdgePoints } from '../apply_dagre';
import type { DagCompoundGroup, DagEdge, DagNode } from '../types';

const NODE_W = 300;
const NODE_H = 64;
const CENTER_TOLERANCE = 2;

const node = (id: string): DagNode => ({ id, width: NODE_W, height: NODE_H });
const edge = (id: string, source: string, target: string): DagEdge => ({ id, source, target });

const findNode = (nodes: ReturnType<typeof dagLayout>['nodes'], id: string) => {
  const n = nodes.find((x) => x.id === id);
  if (!n) throw new Error(`Expected positioned node "${id}"`);
  return n;
};

const centerX = (n: ReturnType<typeof findNode>) => n.x + n.width / 2;
const centerY = (n: ReturnType<typeof findNode>) => n.y + n.height / 2;

const findEdge = (edges: ReturnType<typeof dagLayout>['edges'], source: string, target: string) => {
  const e = edges.find((x) => x.source === source && x.target === target);
  if (!e) throw new Error(`Expected edge ${source} → ${target}`);
  return e;
};

// ─── Basic positioning ─────────────────────────────────────────────────────────

describe('dagLayout — basic positioning', () => {
  it('gives every node finite numeric coordinates', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [edge('ab', 'a', 'b'), edge('bc', 'b', 'c')];
    const { nodes: laid } = dagLayout(nodes, edges);
    for (const n of laid) {
      expect(isFinite(n.x)).toBe(true);
      expect(isFinite(n.y)).toBe(true);
    }
  });

  it('returns edges with points arrays', () => {
    const nodes = [node('a'), node('b')];
    const edges = [edge('ab', 'a', 'b')];
    const { edges: laid } = dagLayout(nodes, edges);
    for (const e of laid) {
      expect(Array.isArray(e.points)).toBe(true);
    }
  });

  it('TB layout — y-spread exceeds x-spread for a linear chain', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [edge('ab', 'a', 'b'), edge('bc', 'b', 'c')];
    const { nodes: laid } = dagLayout(nodes, edges, [], { direction: 'TB' });
    const xs = laid.map((n) => n.x);
    const ys = laid.map((n) => n.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(Math.max(...xs) - Math.min(...xs));
  });

  it('LR layout — x-spread exceeds y-spread for a linear chain', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [edge('ab', 'a', 'b'), edge('bc', 'b', 'c')];
    const { nodes: laid } = dagLayout(nodes, edges, [], { direction: 'LR' });
    const xs = laid.map((n) => n.x);
    const ys = laid.map((n) => n.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(Math.max(...ys) - Math.min(...ys));
  });
});

// ─── Barycenter centering ──────────────────────────────────────────────────────

describe('dagLayout — barycenter centering', () => {
  it('TB: merge node is horizontally centered between parallel branch leaves', () => {
    // fork → a, fork → b, a → merge, b → merge
    const nodes = [node('fork'), node('a'), node('b'), node('merge')];
    const edges = [
      edge('fa', 'fork', 'a'),
      edge('fb', 'fork', 'b'),
      edge('am', 'a', 'merge'),
      edge('bm', 'b', 'merge'),
    ];
    const { nodes: laid } = dagLayout(nodes, edges, [], { direction: 'TB' });
    const a = findNode(laid, 'a');
    const b = findNode(laid, 'b');
    const merge = findNode(laid, 'merge');
    const expected = (centerX(a) + centerX(b)) / 2;
    expect(Math.abs(centerX(merge) - expected)).toBeLessThanOrEqual(CENTER_TOLERANCE);
  });

  it('LR: merge node is vertically centered between parallel branch leaves', () => {
    const nodes = [node('fork'), node('a'), node('b'), node('merge')];
    const edges = [
      edge('fa', 'fork', 'a'),
      edge('fb', 'fork', 'b'),
      edge('am', 'a', 'merge'),
      edge('bm', 'b', 'merge'),
    ];
    const { nodes: laid } = dagLayout(nodes, edges, [], { direction: 'LR' });
    const a = findNode(laid, 'a');
    const b = findNode(laid, 'b');
    const merge = findNode(laid, 'merge');
    const expected = (centerY(a) + centerY(b)) / 2;
    expect(Math.abs(centerY(merge) - expected)).toBeLessThanOrEqual(CENTER_TOLERANCE);
  });

  it('TB linear chain: all nodes share the same center X', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [edge('ab', 'a', 'b'), edge('bc', 'b', 'c')];
    const { nodes: laid } = dagLayout(nodes, edges, [], { direction: 'TB' });
    const centers = laid.map((n) => centerX(n));
    expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(CENTER_TOLERANCE);
  });

  it('TB parallel fan-out: sibling nodes are horizontally separated', () => {
    const nodes = [node('fork'), node('a'), node('b')];
    const edges = [edge('fa', 'fork', 'a'), edge('fb', 'fork', 'b')];
    const { nodes: laid } = dagLayout(nodes, edges, [], { direction: 'TB' });
    const a = findNode(laid, 'a');
    const b = findNode(laid, 'b');
    expect(Math.abs(centerX(a) - centerX(b))).toBeGreaterThan(NODE_W / 2);
  });
});

// ─── Edge waypoints ────────────────────────────────────────────────────────────

describe('dagLayout — edge waypoints', () => {
  it('TB linear chain edge waypoints share center X with nodes', () => {
    const nodes = [node('a'), node('b')];
    const edges = [edge('ab', 'a', 'b')];
    const { nodes: laid, edges: laidEdges } = dagLayout(nodes, edges, [], { direction: 'TB' });
    const a = findNode(laid, 'a');
    const b = findNode(laid, 'b');
    const e = findEdge(laidEdges, 'a', 'b');
    for (const p of e.points) {
      expect(Math.abs(p.x - centerX(a))).toBeLessThanOrEqual(CENTER_TOLERANCE);
      expect(Math.abs(p.x - centerX(b))).toBeLessThanOrEqual(CENTER_TOLERANCE);
    }
  });

  it('fan-out edge has no dagre waypoints (smooth-step routing)', () => {
    // fork fans out to a and b — branch edges should have empty points
    const nodes = [node('fork'), node('a'), node('b')];
    const edges = [edge('fa', 'fork', 'a'), edge('fb', 'fork', 'b')];
    const { edges: laidEdges } = dagLayout(nodes, edges, [], { direction: 'TB' });
    const fa = findEdge(laidEdges, 'fork', 'a');
    const fb = findEdge(laidEdges, 'fork', 'b');
    expect(fa.points.length).toBeLessThan(2);
    expect(fb.points.length).toBeLessThan(2);
  });
});

// ─── resolveShiftedEdgePoints ──────────────────────────────────────────────────

describe('resolveShiftedEdgePoints', () => {
  it('drops co-linear spine waypoints when middle bus is laterally stale', () => {
    const result = resolveShiftedEdgePoints({
      shifted: [
        { x: 175, y: 100 },
        { x: 400, y: 150 },
        { x: 175, y: 200 },
      ],
      sourceCenter: 175,
      targetCenter: 175,
      crossAxis: 'x',
    });
    expect(result).toEqual([]);
  });

  it('keeps shifted waypoints when middle bus stays within endpoint span', () => {
    const shifted = [
      { x: 175, y: 100 },
      { x: 180, y: 150 },
      { x: 175, y: 200 },
    ];
    expect(
      resolveShiftedEdgePoints({ shifted, sourceCenter: 175, targetCenter: 175, crossAxis: 'x' })
    ).toEqual(shifted);
  });
});

// ─── Compound groups ───────────────────────────────────────────────────────────

describe('dagLayout — compound groups', () => {
  it('inner nodes are positioned absolutely (not relative to group)', () => {
    const outerNodes = [node('trigger'), node('group'), node('end')];
    const outerEdges = [edge('tg', 'trigger', 'group'), edge('ge', 'group', 'end')];
    const innerNodes = [node('inner-a'), node('inner-b')];
    const innerEdges = [edge('ia-ib', 'inner-a', 'inner-b')];
    const groups: DagCompoundGroup[] = [{ id: 'group', innerNodes, innerEdges }];
    const { nodes: laid } = dagLayout(outerNodes, outerEdges, groups, {
      compoundPadding: { top: 70, right: 32, bottom: 32, left: 32 },
    });

    const groupNode = findNode(laid, 'group');
    const innerA = findNode(laid, 'inner-a');
    const innerB = findNode(laid, 'inner-b');

    // Inner nodes should be within the group container's absolute bounds
    expect(innerA.x).toBeGreaterThanOrEqual(groupNode.x);
    expect(innerA.y).toBeGreaterThanOrEqual(groupNode.y);
    expect(innerA.x + innerA.width).toBeLessThanOrEqual(groupNode.x + groupNode.width + 1);
    expect(innerA.y + innerA.height).toBeLessThanOrEqual(groupNode.y + groupNode.height + 1);
    expect(innerB.x).toBeGreaterThanOrEqual(groupNode.x);
    expect(innerB.y).toBeGreaterThanOrEqual(groupNode.y);
  });

  it('group container expands to encompass its inner nodes plus padding', () => {
    const padding = { top: 70, right: 32, bottom: 32, left: 32 };
    const outerNodes = [node('group')];
    const innerNodes = [node('inner')];
    const groups: DagCompoundGroup[] = [{ id: 'group', innerNodes, innerEdges: [] }];
    const { nodes: laid } = dagLayout(outerNodes, [], groups, { compoundPadding: padding });

    const groupNode = findNode(laid, 'group');
    expect(groupNode.width).toBeGreaterThanOrEqual(NODE_W + padding.left + padding.right);
    expect(groupNode.height).toBeGreaterThanOrEqual(NODE_H + padding.top + padding.bottom);
  });

  it('inner edge waypoints are in absolute coordinates', () => {
    const outerNodes = [node('group')];
    const innerNodes = [node('inner-a'), node('inner-b')];
    const innerEdges = [edge('e', 'inner-a', 'inner-b')];
    const groups: DagCompoundGroup[] = [{ id: 'group', innerNodes, innerEdges }];
    const { nodes: laid, edges: laidEdges } = dagLayout(outerNodes, [], groups, {
      compoundPadding: { top: 70, right: 32, bottom: 32, left: 32 },
    });

    const groupNode = findNode(laid, 'group');
    const e = findEdge(laidEdges, 'inner-a', 'inner-b');
    for (const p of e.points) {
      expect(p.x).toBeGreaterThanOrEqual(groupNode.x - 1);
      expect(p.y).toBeGreaterThanOrEqual(groupNode.y - 1);
    }
  });

  it('nested compound group (group-in-group) — all nodes have finite positions', () => {
    const outerNodes = [node('outer-group')];
    const innerGroupNode = node('inner-group');
    const innerInnerNodes = [node('deep-a'), node('deep-b')];
    const innerInnerEdges = [edge('da-db', 'deep-a', 'deep-b')];

    const groups: DagCompoundGroup[] = [
      { id: 'inner-group', innerNodes: innerInnerNodes, innerEdges: innerInnerEdges },
      { id: 'outer-group', innerNodes: [innerGroupNode], innerEdges: [] },
    ];

    const { nodes: laid } = dagLayout(outerNodes, [], groups, {
      compoundPadding: { top: 70, right: 32, bottom: 32, left: 32 },
    });

    for (const n of laid) {
      expect(isFinite(n.x)).toBe(true);
      expect(isFinite(n.y)).toBe(true);
    }
    // All 4 nodes should appear: outer-group, inner-group, deep-a, deep-b
    expect(laid.map((n) => n.id).sort()).toEqual(
      ['deep-a', 'deep-b', 'inner-group', 'outer-group'].sort()
    );
  });
});

// ─── Compact mode ─────────────────────────────────────────────────────────────

describe('dagLayout — compact mode', () => {
  it('inner nodes are absent from output in compact mode', () => {
    const outerNodes = [node('group')];
    const innerNodes = [node('inner-a'), node('inner-b')];
    const innerEdges = [edge('e', 'inner-a', 'inner-b')];
    const groups: DagCompoundGroup[] = [{ id: 'group', innerNodes, innerEdges }];

    const { nodes: laid } = dagLayout(outerNodes, [], groups, { compact: true });

    expect(laid.map((n) => n.id)).toEqual(['group']);
    expect(laid.find((n) => n.id === 'inner-a')).toBeUndefined();
  });

  it('container uses the caller-provided dimensions in compact mode', () => {
    const containerWidth = 200;
    const containerHeight = 100;
    const outerNodes = [{ id: 'group', width: containerWidth, height: containerHeight }];
    const innerNodes = [node('inner')];
    const groups: DagCompoundGroup[] = [{ id: 'group', innerNodes, innerEdges: [] }];

    const { nodes: laid } = dagLayout(outerNodes, [], groups, { compact: true });

    const groupNode = findNode(laid, 'group');
    expect(groupNode.width).toBe(containerWidth);
    expect(groupNode.height).toBe(containerHeight);
  });
});

// ─── align_cross_axis — uncovered branches ─────────────────────────────────────

describe('dagLayout — handleMultipleChildren with siblingsWithSharedChildren.length > 1', () => {
  // Topology (TB):
  //         root
  //        /    \
  //       a      b
  //      / \    / \
  //     c1  c2 c1  c2  ← a and b are siblings that BOTH fan into c1 and c2
  //
  // When the barycenter pass processes 'a', it has multiple children [c1, c2] AND
  // sibling 'b' shares those same children. This triggers the spacing formula in
  // handleMultipleChildren (siblingsWithSharedChildren.length > 1).
  // After layout, 'a' and 'b' must be horizontally separated and neither should
  // overlap 'c1' or 'c2'.
  it('sibling nodes that share multiple children do not overlap each other or their children', () => {
    const nodes = [node('root'), node('a'), node('b'), node('c1'), node('c2')];
    const edges = [
      edge('r-a', 'root', 'a'),
      edge('r-b', 'root', 'b'),
      edge('a-c1', 'a', 'c1'),
      edge('a-c2', 'a', 'c2'),
      edge('b-c1', 'b', 'c1'),
      edge('b-c2', 'b', 'c2'),
    ];
    const { nodes: laid } = dagLayout(nodes, edges, [], { direction: 'TB' });

    // All pairs must be non-overlapping.
    for (let i = 0; i < laid.length; i++) {
      for (let j = i + 1; j < laid.length; j++) {
        const na = laid[i];
        const nb = laid[j];
        const overlapX = na.x < nb.x + nb.width && na.x + na.width > nb.x;
        const overlapY = na.y < nb.y + nb.height && na.y + na.height > nb.y;
        expect(overlapX && overlapY).toBe(false);
      }
    }

    // Siblings 'a' and 'b' must be horizontally separated (they are on the same rank).
    const aNode = findNode(laid, 'a');
    const bNode = findNode(laid, 'b');
    expect(Math.abs(centerX(aNode) - centerX(bNode))).toBeGreaterThan(NODE_W / 2);
  });
});

describe('dagLayout — compound inner-node overlap invariant', () => {
  // The existing overlap tests run with compoundGroups = []. This test verifies
  // inner nodes inside a group container also remain non-overlapping after the
  // absolute-position translation (getGroupAbsolutePosition).
  it('inner nodes of a compound group do not overlap each other', () => {
    const outerNodes = [node('trigger'), node('group'), node('end')];
    const outerEdges = [edge('t-g', 'trigger', 'group'), edge('g-e', 'group', 'end')];
    // Diamond topology inside the group to exercise the barycenter pass on inner nodes.
    const innerNodes = [node('fork'), node('branch-a'), node('branch-b'), node('join')];
    const innerEdges = [
      edge('f-a', 'fork', 'branch-a'),
      edge('f-b', 'fork', 'branch-b'),
      edge('a-j', 'branch-a', 'join'),
      edge('b-j', 'branch-b', 'join'),
    ];
    const groups: DagCompoundGroup[] = [{ id: 'group', innerNodes, innerEdges }];
    const { nodes: laid } = dagLayout(outerNodes, outerEdges, groups, {
      compoundPadding: { top: 70, right: 32, bottom: 32, left: 32 },
    });

    const innerLaid = laid.filter((n) => ['fork', 'branch-a', 'branch-b', 'join'].includes(n.id));
    expect(innerLaid).toHaveLength(4);

    // No two inner nodes should overlap.
    for (let i = 0; i < innerLaid.length; i++) {
      for (let j = i + 1; j < innerLaid.length; j++) {
        const na = innerLaid[i];
        const nb = innerLaid[j];
        const overlapX = na.x < nb.x + nb.width && na.x + na.width > nb.x;
        const overlapY = na.y < nb.y + nb.height && na.y + na.height > nb.y;
        expect(overlapX && overlapY).toBe(false);
      }
    }

    // The join node should be horizontally centered between branch-a and branch-b.
    const branchA = findNode(laid, 'branch-a');
    const branchB = findNode(laid, 'branch-b');
    const join = findNode(laid, 'join');
    const expectedCenter = (centerX(branchA) + centerX(branchB)) / 2;
    expect(Math.abs(centerX(join) - expectedCenter)).toBeLessThanOrEqual(CENTER_TOLERANCE);
  });
});

// ─── Many-branch overlap regression (issue #18606) ─────────────────────────────
//
// Real-world reproduction from a workflow with a foreach body that is a deeply
// nested if/else "staircase": each `if` has a single-leaf `then` branch and an
// `else` branch heading a wide/deep subtree. dagre lays these out without
// overlap, but the barycenter pass (alignDagreCrossAxisInPlace) pulls the wide
// `else`-subtree head across the rank until it collides with the `then`-leaf
// sibling. This graph is the exact inner graph the workflow transform produces
// for that foreach (dumped from transformWorkflowToGraph), minimised to node ids
// and edges. It must remain non-overlapping both as a compound group and flat.

const INFOSEC_INNER_IDS = [
  'check-existing-review',
  'needs-processing',
  'check-scores',
  'handle-quota-exceeded',
  'classify-pending-quota',
  'evaluate-catalog-presence',
  'classify-not-cataloged',
  'check-verdicts',
  'check-detections',
  'check-vulnerabilities',
  'check-extensions',
  'evaluate-high-risk-signals',
  'classify-malicious',
  'alert-slack-malicious',
  'evaluate-risk-score',
  'classify-high-risk-score',
  'alert-slack-high-risk',
  'classify-remaining',
  'classify-needs-review-permissions',
  'classify-auto-approved',
  'touch-seen',
];

const INFOSEC_INNER_EDGES: ReadonlyArray<readonly [string, string]> = [
  ['check-existing-review', 'needs-processing'],
  ['needs-processing', 'check-scores'],
  ['needs-processing', 'touch-seen'],
  ['check-scores', 'handle-quota-exceeded'],
  ['handle-quota-exceeded', 'classify-pending-quota'],
  ['handle-quota-exceeded', 'evaluate-catalog-presence'],
  ['evaluate-catalog-presence', 'classify-not-cataloged'],
  ['evaluate-catalog-presence', 'check-verdicts'],
  ['check-verdicts', 'check-detections'],
  ['check-detections', 'check-vulnerabilities'],
  ['check-vulnerabilities', 'check-extensions'],
  ['check-extensions', 'evaluate-high-risk-signals'],
  ['evaluate-high-risk-signals', 'classify-malicious'],
  ['evaluate-high-risk-signals', 'evaluate-risk-score'],
  ['classify-malicious', 'alert-slack-malicious'],
  ['evaluate-risk-score', 'classify-high-risk-score'],
  ['evaluate-risk-score', 'classify-remaining'],
  ['classify-high-risk-score', 'alert-slack-high-risk'],
  ['classify-remaining', 'classify-needs-review-permissions'],
  ['classify-remaining', 'classify-auto-approved'],
];

const infosecInnerNodes = (): DagNode[] => INFOSEC_INNER_IDS.map((id) => node(id));
const infosecInnerEdges = (): DagEdge[] =>
  INFOSEC_INNER_EDGES.map(([source, target], i) => edge(`e${i}`, source, target));

const expectNoPairwiseOverlap = (nodes: ReturnType<typeof dagLayout>['nodes']): void => {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
      const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
      if (overlapX && overlapY) {
        throw new Error(`Nodes "${a.id}" and "${b.id}" overlap`);
      }
    }
  }
};

describe('dagLayout — many-branch overlap regression (#18606)', () => {
  it('inner nodes of a deeply nested if/else foreach body do not overlap', () => {
    const groups: DagCompoundGroup[] = [
      { id: 'group', innerNodes: infosecInnerNodes(), innerEdges: infosecInnerEdges() },
    ];
    const { nodes: laid } = dagLayout([node('group')], [], groups, {
      direction: 'TB',
      nodeSep: 50,
      rankSep: 70,
      compoundPadding: { top: 70, right: 32, bottom: 32, left: 32 },
    });
    const inner = laid.filter((n) => n.id !== 'group');
    expect(inner).toHaveLength(INFOSEC_INNER_IDS.length);
    expectNoPairwiseOverlap(inner);
  });

  it('the same graph laid out flat (non-compound) does not overlap and keeps edges intact', () => {
    const { nodes: laid, edges: laidEdges } = dagLayout(
      infosecInnerNodes(),
      infosecInnerEdges(),
      [],
      { direction: 'TB', nodeSep: 50, rankSep: 70 }
    );
    expectNoPairwiseOverlap(laid);

    // Every input edge is still present and every waypoint is finite after the
    // separation pass (no detached or NaN-routed edges).
    expect(laidEdges).toHaveLength(INFOSEC_INNER_EDGES.length);
    for (const e of laidEdges) {
      for (const p of e.points) {
        expect(isFinite(p.x)).toBe(true);
        expect(isFinite(p.y)).toBe(true);
      }
    }
  });

  it('LR direction is also non-overlapping for the same graph', () => {
    const { nodes: laid } = dagLayout(infosecInnerNodes(), infosecInnerEdges(), [], {
      direction: 'LR',
      nodeSep: 50,
      rankSep: 70,
    });
    expectNoPairwiseOverlap(laid);
  });
});

// ─── Cycle detection ──────────────────────────────────────────────────────────

describe('dagLayout — cycle detection', () => {
  it('throws when compound groups form a cycle', () => {
    const groupA = node('groupA');
    const groupB = node('groupB');
    const groups: DagCompoundGroup[] = [
      { id: 'groupA', innerNodes: [groupB], innerEdges: [] },
      { id: 'groupB', innerNodes: [groupA], innerEdges: [] },
    ];
    expect(() => dagLayout([groupA, groupB], [], groups)).toThrow(/cycle/i);
  });
});

// ─── analyzeSiblings asymmetric prevCross comparison ──────────────────────────
//
// Regression: the `firstSibling`/`lastSibling` reduce in `analyzeSiblings` was
// comparing the candidate in `prevCross ?? cross` space against the accumulator
// in raw `cross` space. This can pick the wrong outermost sibling when one sibling
// was shifted by an earlier pass — causing mis-centering in handleSingleChild and
// handleMultipleParents. The fix makes both sides of the comparison use
// `prevCross ?? cross` so both candidate and accumulator are always evaluated in
// the same pre-shift coordinate space.

describe('dagLayout — analyzeSiblings prevCross symmetry', () => {
  it('3-way merge node is horizontally centered between its outermost parents', () => {
    // Topology (TB):
    //   root → pa, root → pb, root → pc
    //   pa → merge, pb → merge, pc → merge
    //   pa → sideA (leaf)        ← forces pa into handleMultipleChildren
    //   pc → sideC (leaf)        ← forces pc into handleMultipleChildren
    //
    // After pa and pc are shifted by handleMultipleChildren, analyzeSiblings([pa,pb,pc])
    // is called. With the bug the asymmetric comparison can select the wrong outermost
    // parent, corrupting edgesSpan and centering merge between the wrong pair.
    const nodes = [
      node('root'),
      node('pa'),
      node('pb'),
      node('pc'),
      node('merge'),
      node('sideA'),
      node('sideC'),
    ];
    const edges = [
      edge('r-pa', 'root', 'pa'),
      edge('r-pb', 'root', 'pb'),
      edge('r-pc', 'root', 'pc'),
      edge('pa-m', 'pa', 'merge'),
      edge('pb-m', 'pb', 'merge'),
      edge('pc-m', 'pc', 'merge'),
      edge('pa-sA', 'pa', 'sideA'),
      edge('pc-sC', 'pc', 'sideC'),
    ];
    const { nodes: laid } = dagLayout(nodes, edges, [], { direction: 'TB' });

    const pa = findNode(laid, 'pa');
    const pb = findNode(laid, 'pb');
    const pc = findNode(laid, 'pc');
    const merge = findNode(laid, 'merge');

    // All nodes must be non-overlapping.
    for (let i = 0; i < laid.length; i++) {
      for (let j = i + 1; j < laid.length; j++) {
        const a = laid[i];
        const b = laid[j];
        const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
        const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
        expect(overlapX && overlapY).toBe(false);
      }
    }

    // merge should be horizontally centered between the outermost parents.
    const leftMost = Math.min(centerX(pa), centerX(pb), centerX(pc));
    const rightMost = Math.max(centerX(pa), centerX(pb), centerX(pc));
    const expectedCenter = (leftMost + rightMost) / 2;
    expect(Math.abs(centerX(merge) - expectedCenter)).toBeLessThanOrEqual(CENTER_TOLERANCE);
  });
});

// ─── reservedLanes — fallback lane placement ───────────────────────────────────
//
// Lane nodes are removed from dagre's input and placed in the +cross margin.
// The owner has exactly one spine successor → `handleSingleChild` fires →
// spine is structurally straight (100%, not heuristically).
//
// Cascade rule (D3, revised): the lane head starts one rank below the owner,
// i.e. `head.y ≈ owner.y + owner.height + rankSep` in TB. Each nesting depth
// steps one rank further down and one lane further right (D12).
// The spine below the owner clears the lane's full subtree extent (D7).

describe('dagLayout — reservedLanes', () => {
  // Default separations used by dagLayout when not overridden.
  const DEFAULT_NODE_SEP = 50;
  const DEFAULT_RANK_SEP = 70;
  // Helper: build the asymmetric-fork fixture used across these tests.
  // Topology (TB): s1→s2→s3 (spine); s2→fb1→fb2 (failure lane, boundary edges).
  const ASYMMETRIC_FORK_NODES = () => [
    node('s1'),
    node('s2'),
    node('s3'),
    node('fb1'),
    node('fb2'),
  ];
  const ASYMMETRIC_FORK_EDGES = () => [
    edge('s1-s2', 's1', 's2'),
    edge('s2-s3', 's2', 's3'),
    edge('s2-fb1', 's2', 'fb1'), // boundary: owner→lane head
    edge('fb1-fb2', 'fb1', 'fb2'), // lane-internal
  ];
  const ASYMMETRIC_FORK_LANES = (): import('../types').DagReservedLane[] => [
    { nodeIds: ['fb1', 'fb2'], depth: 0, ownerId: 's2' },
  ];

  it('spine is straight by construction: s1, s2, s3 share the same center column', () => {
    const { nodes: laid } = dagLayout(ASYMMETRIC_FORK_NODES(), ASYMMETRIC_FORK_EDGES(), [], {
      reservedLanes: ASYMMETRIC_FORK_LANES(),
    });
    const s1 = findNode(laid, 's1');
    const s2 = findNode(laid, 's2');
    const s3 = findNode(laid, 's3');
    expect(Math.abs(centerX(s1) - centerX(s2))).toBeLessThan(CENTER_TOLERANCE);
    expect(Math.abs(centerX(s2) - centerX(s3))).toBeLessThan(CENTER_TOLERANCE);
  });

  it('lane head sits one rank below its owner on main axis (cascade, D3)', () => {
    const { nodes: laid } = dagLayout(ASYMMETRIC_FORK_NODES(), ASYMMETRIC_FORK_EDGES(), [], {
      reservedLanes: ASYMMETRIC_FORK_LANES(),
    });
    const s2 = findNode(laid, 's2');
    const fb1 = findNode(laid, 'fb1');
    // Cascade: fb1.y = s2.y + s2.height + rankSep (leading-edge drop, not centre-align).
    expect(fb1.y).toBeCloseTo(s2.y + s2.height + DEFAULT_RANK_SEP, 0);
  });

  it('lane sits in the +cross margin, right of the spine in TB', () => {
    const { nodes: laid } = dagLayout(ASYMMETRIC_FORK_NODES(), ASYMMETRIC_FORK_EDGES(), [], {
      reservedLanes: ASYMMETRIC_FORK_LANES(),
    });
    const s2 = findNode(laid, 's2');
    const fb1 = findNode(laid, 'fb1');
    // Lane is to the RIGHT of the spine (cross axis = x in TB).
    expect(centerX(fb1)).toBeGreaterThan(centerX(s2) + 100);
  });

  it('reservedLanes: [] is a zero-behaviour-change no-op for a linear chain', () => {
    const nodes = [node('a'), node('b'), node('c')];
    const edges = [edge('ab', 'a', 'b'), edge('bc', 'b', 'c')];
    const { nodes: without } = dagLayout(nodes, edges);
    const { nodes: withEmpty } = dagLayout(nodes, edges, [], { reservedLanes: [] });
    for (const id of ['a', 'b', 'c']) {
      const n1 = findNode(without, id);
      const n2 = findNode(withEmpty, id);
      expect(n1.x).toBeCloseTo(n2.x, 0);
      expect(n1.y).toBeCloseTo(n2.y, 0);
    }
  });

  it('failure lane beside a deep if — no pairwise overlap', () => {
    // s1→s2 (owner with fallback) → s3→s4
    // s2→fb1→fb2 (reserved lane)
    // s2→branch-a / s2→branch-b (if gate — produces its own fork)
    const nodes = [
      node('s1'),
      node('s2'),
      node('branch-a'),
      node('branch-b'),
      node('s3'),
      node('s4'),
      node('fb1'),
      node('fb2'),
    ];
    const edgeList = [
      edge('s1-s2', 's1', 's2'),
      edge('s2-ba', 's2', 'branch-a'),
      edge('s2-bb', 's2', 'branch-b'),
      edge('ba-s3', 'branch-a', 's3'),
      edge('bb-s3', 'branch-b', 's3'),
      edge('s3-s4', 's3', 's4'),
      edge('s2-fb1', 's2', 'fb1'),
      edge('fb1-fb2', 'fb1', 'fb2'),
    ];
    const { nodes: laid } = dagLayout(nodes, edgeList, [], {
      reservedLanes: [{ nodeIds: ['fb1', 'fb2'], depth: 0, ownerId: 's2' }],
    });
    expectNoPairwiseOverlap(laid);
  });

  // ── Cascade ordering gate ─────────────────────────────────────────────────
  //
  // This is the fixture whose ABSENCE let the depth-inversion bug ship.
  // ASYMMETRIC_FORK_LANES has a single depth-0 lane and no nesting, so the
  // previous suite never exercised lane-vs-lane ordering. These tests do.

  it('depth-3 nested lanes: cross order is monotonically outward (cascade gate)', () => {
    // Spine: s1 → s2 → s3
    // Depth-0 lane: owner=s2, nodes=[n0] (fallback of s2)
    // Depth-1 lane: owner=n0, nodes=[n1] (fallback of n0)
    // Depth-2 lane: owner=n1, nodes=[n2] (fallback of n1)
    //
    //  col 0 (spine)   col 1 (d=0)   col 2 (d=1)   col 3 (d=2)
    //      [s2] ─────────► [n0] ─────────► [n1] ─────────► [n2]
    const nodes = [node('s1'), node('s2'), node('s3'), node('n0'), node('n1'), node('n2')];
    const edgeList = [
      edge('s1-s2', 's1', 's2'),
      edge('s2-s3', 's2', 's3'),
      edge('s2-n0', 's2', 'n0'), // boundary
      edge('n0-n1', 'n0', 'n1'), // boundary
      edge('n1-n2', 'n1', 'n2'), // boundary
    ];
    const reservedLanes = [
      { nodeIds: ['n0'], depth: 0, ownerId: 's2' },
      { nodeIds: ['n1'], depth: 1, ownerId: 'n0' },
      { nodeIds: ['n2'], depth: 2, ownerId: 'n1' },
    ];
    const { nodes: laid } = dagLayout(nodes, edgeList, [], { reservedLanes });

    const s2 = findNode(laid, 's2');
    const s3 = findNode(laid, 's3');
    const n0 = findNode(laid, 'n0');
    const n1 = findNode(laid, 'n1');
    const n2 = findNode(laid, 'n2');

    // Main axis (TB): each head one rank below its owner.
    expect(n0.y).toBeCloseTo(s2.y + s2.height + DEFAULT_RANK_SEP, 0);
    expect(n1.y).toBeCloseTo(n0.y + n0.height + DEFAULT_RANK_SEP, 0);
    expect(n2.y).toBeCloseTo(n1.y + n1.height + DEFAULT_RANK_SEP, 0);

    // Cross axis (TB = x): strictly monotonically outward (right).
    expect(n0.x).toBeGreaterThan(s2.x + s2.width); // col 1 right of spine
    expect(n1.x).toBeGreaterThan(n0.x + n0.width); // col 2 right of col 1
    expect(n2.x).toBeGreaterThan(n1.x + n1.width); // col 3 right of col 2

    // D7: spine below s2 clears the deepest lane node (n2).
    expect(s3.y).toBeGreaterThanOrEqual(n2.y + n2.height + DEFAULT_RANK_SEP - CENTER_TOLERANCE);

    // No overlaps.
    expectNoPairwiseOverlap(laid);
  });

  it('multi-step fallback block stays in one column — only depth moves you right (D11)', () => {
    // owner s2's fallback is [fb1, fb2] — two steps, no nested fallback.
    // Both should share the same x (same column), fb2 below fb1.
    const nodes = [node('s1'), node('s2'), node('s3'), node('fb1'), node('fb2')];
    const edgeList = [
      edge('s1-s2', 's1', 's2'),
      edge('s2-s3', 's2', 's3'),
      edge('s2-fb1', 's2', 'fb1'),
      edge('fb1-fb2', 'fb1', 'fb2'),
    ];
    const { nodes: laid } = dagLayout(nodes, edgeList, [], {
      reservedLanes: [{ nodeIds: ['fb1', 'fb2'], depth: 0, ownerId: 's2' }],
    });
    const fb1 = findNode(laid, 'fb1');
    const fb2 = findNode(laid, 'fb2');
    // Same column: left edges coincide.
    expect(Math.abs(fb1.x - fb2.x)).toBeLessThan(CENTER_TOLERANCE);
    // fb2 is below fb1.
    expect(fb2.y).toBeGreaterThan(fb1.y + fb1.height - CENTER_TOLERANCE);
    expectNoPairwiseOverlap(laid);
  });

  it('nested lane anchors to its OWN owner, not the whole parent lane (D12)', () => {
    // s2.fallback: [a, b]   and   a.fallback: [c]
    //
    //  col 0    col 1    col 2
    //  [s2] ──► [a] ──► [c]
    //            |
    //           [b]         ← b and c may share a rank but are in different columns
    //
    // c must be one rank below a (its owner), NOT below b.
    const nodes = [node('s1'), node('s2'), node('s3'), node('a'), node('b'), node('c')];
    const edgeList = [
      edge('s1-s2', 's1', 's2'),
      edge('s2-s3', 's2', 's3'),
      edge('s2-a', 's2', 'a'),
      edge('a-b', 'a', 'b'),
      edge('a-c', 'a', 'c'),
    ];
    const { nodes: laid } = dagLayout(nodes, edgeList, [], {
      reservedLanes: [
        { nodeIds: ['a', 'b'], depth: 0, ownerId: 's2' },
        { nodeIds: ['c'], depth: 1, ownerId: 'a' },
      ],
    });
    const s2 = findNode(laid, 's2');
    const a = findNode(laid, 'a');
    const b = findNode(laid, 'b');
    const c = findNode(laid, 'c');

    // a one rank below s2.
    expect(a.y).toBeCloseTo(s2.y + s2.height + DEFAULT_RANK_SEP, 0);
    // c one rank below a (its owner), NOT below b.
    expect(c.y).toBeCloseTo(a.y + a.height + DEFAULT_RANK_SEP, 0);
    // b and c may share a rank — assert they do NOT overlap cross-axis.
    const bRight = b.x + b.width;
    const cLeft = c.x;
    expect(cLeft).toBeGreaterThan(bRight - DEFAULT_NODE_SEP);
    expectNoPairwiseOverlap(laid);
  });

  it('two sequential spine owners: each lane head levels against its pushed owner (Fix 2)', () => {
    // s1→O1→O2→s4 (spine)
    // O1.fallback: [fb1a, fb1b]   O2.fallback: [fb2a, fb2b]
    //
    // O1's push moves O2 down. O2's cascade must level against O2's PUSHED
    // position, not against O2's pre-push position.
    const nodes = [
      node('s1'),
      node('O1'),
      node('O2'),
      node('s4'),
      node('fb1a'),
      node('fb1b'),
      node('fb2a'),
      node('fb2b'),
    ];
    const edgeList = [
      edge('s1-O1', 's1', 'O1'),
      edge('O1-O2', 'O1', 'O2'),
      edge('O2-s4', 'O2', 's4'),
      edge('O1-fb1a', 'O1', 'fb1a'),
      edge('fb1a-fb1b', 'fb1a', 'fb1b'),
      edge('O2-fb2a', 'O2', 'fb2a'),
      edge('fb2a-fb2b', 'fb2a', 'fb2b'),
    ];
    const { nodes: laid } = dagLayout(nodes, edgeList, [], {
      reservedLanes: [
        { nodeIds: ['fb1a', 'fb1b'], depth: 0, ownerId: 'O1' },
        { nodeIds: ['fb2a', 'fb2b'], depth: 0, ownerId: 'O2' },
      ],
    });
    const O1 = findNode(laid, 'O1');
    const O2 = findNode(laid, 'O2');
    const fb1a = findNode(laid, 'fb1a');
    const fb2a = findNode(laid, 'fb2a');

    // Each head one rank below its own (current) owner.
    expect(fb1a.y).toBeCloseTo(O1.y + O1.height + DEFAULT_RANK_SEP, 0);
    expect(fb2a.y).toBeCloseTo(O2.y + O2.height + DEFAULT_RANK_SEP, 0);

    // O2 must have been pushed past O1's lane extent.
    const fb1b = findNode(laid, 'fb1b');
    expect(O2.y).toBeGreaterThanOrEqual(fb1b.y + fb1b.height + DEFAULT_RANK_SEP - CENTER_TOLERANCE);

    expectNoPairwiseOverlap(laid);
  });

  it('parallel branch is not pushed by D7 (topology-based push, Fix 6)', () => {
    // gate→then→loop→merge   gate→els→merge   then.fallback: [fb]
    //
    // `els` is the else-branch of an if-fork. `loop` is the next step in the
    // then-branch. When the graph has unequal branch depths, dagre may assign
    // `els` to the same rank as `loop` (rank 2) to tighten edge lengths.
    // The old geometric push treated any node at y >= loop.y as a successor of
    // `then` and pushed `els` down — even though it is a parallel branch.
    // The topology-based push (Fix 6) uses transitive reachability via spine
    // edges: `els` is reachable from `gate` but NOT from `then`, so it stays.
    const nodes = [
      node('gate'),
      node('then'),
      node('loop'),
      node('els'),
      node('fb'),
      node('merge'),
    ];
    const edgeList = [
      edge('gate-then', 'gate', 'then'),
      edge('then-loop', 'then', 'loop'),
      edge('loop-merge', 'loop', 'merge'),
      edge('gate-els', 'gate', 'els'),
      edge('els-merge', 'els', 'merge'),
    ];
    const { nodes: laid } = dagLayout(nodes, edgeList, [], {
      reservedLanes: [{ nodeIds: ['fb'], depth: 0, ownerId: 'then' }],
    });
    const thenN = findNode(laid, 'then');
    const elsN = findNode(laid, 'els');
    const loopN = findNode(laid, 'loop');
    const mergeN = findNode(laid, 'merge');
    const fbN = findNode(laid, 'fb');

    // `els` must NOT be pushed below `then`. `loop` was pushed by deficit D,
    // so loop.y = rank2_y + D. With topology-based push `els` stays at its
    // original dagre rank (rank2_y or rank1_y), giving els.y < loop.y.
    // The old geometric push pushed `els` too when dagre placed it at rank 2,
    // giving els.y == loop.y — this assertion would fail in that case.
    expect(elsN.y).toBeLessThan(loopN.y - CENTER_TOLERANCE);

    // Cascade: fb lands one rank below its owner.
    expect(fbN.y).toBeCloseTo(thenN.y + thenN.height + DEFAULT_RANK_SEP, 0);

    // Loop and merge ARE pushed (real topological successors of then).
    expect(loopN.y).toBeGreaterThanOrEqual(
      fbN.y + fbN.height + DEFAULT_RANK_SEP - CENTER_TOLERANCE
    );
    expect(mergeN.y).toBeGreaterThan(loopN.y);

    expectNoPairwiseOverlap(laid);
  });
});

// ─── Cycle B: fork-head alignment must not depend on unrelated lanes ──────────
//
// §3.5 of layout_graph_with_lanes.ts corrects a dagre tight-tree artifact:
// the shorter branch of an if/else gets assigned a later rank to tighten the
// edge to the merge node. This correction should apply regardless of whether
// any reserved lane exists elsewhere in the graph.
//
// Bug: §3.5 sits after the `lanes.length === 0` early return, so it only runs
// when some (possibly unrelated) lane exists. Adding an on-failure to any step
// anywhere in the YAML silently changes every unrelated fork's geometry.
//
// Fix: hoist §3.5 above the early return so it always runs.

describe('dagLayout — fork-head alignment is lane-independent (Cycle B)', () => {
  it('fork heads share the same main-axis rank with and without an unrelated lane', () => {
    // Topology: fork → [then, els]; both merge to end.
    // Then has a longer chain (then→thenB) to provoke tight-tree rank-skew on els.
    // `distant` is a separate node wired in the reserved lane — unrelated to the fork.
    const forkNodes = [
      node('start'),
      node('fork'),
      node('then'),
      node('thenB'),
      node('els'),
      node('merge'),
      node('end'),
    ];
    const forkEdges = [
      edge('s-f', 'start', 'fork'),
      edge('f-t', 'fork', 'then'),
      edge('f-e', 'fork', 'els'),
      edge('t-tb', 'then', 'thenB'),
      edge('tb-m', 'thenB', 'merge'),
      edge('e-m', 'els', 'merge'),
      edge('m-end', 'merge', 'end'),
    ];

    // Layout without any reserved lane.
    const { nodes: withoutLane } = dagLayout(forkNodes, forkEdges, [], { direction: 'TB' });

    // Same topology with an unrelated reserved lane on `start`.
    const distantLaneNode = node('distant');
    const nodesWithLane = [...forkNodes, distantLaneNode];
    const edgesWithLane = forkEdges;
    const { nodes: withLane } = dagLayout(nodesWithLane, edgesWithLane, [], {
      direction: 'TB',
      reservedLanes: [{ nodeIds: ['distant'], depth: 0, ownerId: 'start' }],
    });

    const findInLayout =
      (laid: ReturnType<typeof dagLayout>['nodes']) =>
      (id: string): ReturnType<typeof dagLayout>['nodes'][number] => {
        const n = laid.find((x) => x.id === id);
        if (!n) throw new Error(`Node ${id} not found`);
        return n;
      };

    const findWithout = findInLayout(withoutLane);
    const findWith = findInLayout(withLane);

    // The fork heads (then, els) must be at the same y in both layouts.
    // Before the fix, els.y differs because §3.5 only runs when lanes exist.
    const elsWithout = findWithout('els');
    const elsWith = findWith('els');
    const thenWithout = findWithout('then');
    const thenWith = findWith('then');

    // Fork heads must share the same rank in each layout independently.
    // Note: absolute y values differ between the two layouts because the lane on
    // 'start' triggers D7 (spine push), shifting spine successors down to clear
    // the lane's main extent. That is correct behaviour — only the within-layout
    // equality of fork heads matters here.
    expect(elsWithout.y).toBeCloseTo(thenWithout.y, 0);
    expect(elsWith.y).toBeCloseTo(thenWith.y, 0);
  });
});

// ─── Invariants ───────────────────────────────────────────────────────────────

describe('dagLayout — layout invariants', () => {
  it('no two outer nodes overlap in TB layout', () => {
    const nodes = [node('a'), node('b'), node('c'), node('d')];
    const edges = [
      edge('ab', 'a', 'b'),
      edge('ac', 'a', 'c'),
      edge('bd', 'b', 'd'),
      edge('cd', 'c', 'd'),
    ];
    const { nodes: laid } = dagLayout(nodes, edges, [], { direction: 'TB' });

    for (let i = 0; i < laid.length; i++) {
      for (let j = i + 1; j < laid.length; j++) {
        const a = laid[i];
        const b = laid[j];
        const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
        const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
        expect(overlapX && overlapY).toBe(false);
      }
    }
  });

  it('no overlap when two sibling diamonds each have a chain lane next to a leaf lane', () => {
    // Regression for: handleSingleParent drift — chain-lane nodes were shifted
    // left by half their width, desyncing them from adjacent leaf lanes and
    // causing the inner lanes of adjacent diamonds to collide.
    //
    // Topology (TB):
    //   gate
    //   ├─ brA ─ chainA1 ─ chainA2   (chain lane)
    //   │   └─ leafA                  (leaf lane)
    //   └─ brB ─ chainB1 ─ chainB2   (chain lane)
    //       └─ leafB                  (leaf lane)
    //
    // Before the fix: leafA <> chainB1 overlap (−100px gap).
    const nodes = [
      node('gate'),
      node('brA'),
      node('brB'),
      node('chainA1'),
      node('leafA'),
      node('chainB1'),
      node('leafB'),
      node('chainA2'),
      node('chainB2'),
    ];
    const edges = [
      edge('g-brA', 'gate', 'brA'),
      edge('g-brB', 'gate', 'brB'),
      edge('brA-cA1', 'brA', 'chainA1'),
      edge('brA-lA', 'brA', 'leafA'),
      edge('brB-cB1', 'brB', 'chainB1'),
      edge('brB-lB', 'brB', 'leafB'),
      edge('cA1-cA2', 'chainA1', 'chainA2'),
      edge('cB1-cB2', 'chainB1', 'chainB2'),
    ];
    const { nodes: laid } = dagLayout(nodes, edges, [], { direction: 'TB' });

    for (let i = 0; i < laid.length; i++) {
      for (let j = i + 1; j < laid.length; j++) {
        const a = laid[i];
        const b = laid[j];
        const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
        const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
        expect(overlapX && overlapY).toBe(false);
      }
    }
  });
});
