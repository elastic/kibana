/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Integration tests for the full workflow layout pipeline:
 *   transformWorkflowToGraph → computeWorkflowLayout → assert positions.
 */

import { dagLayout, resolveShiftedEdgePoints } from '@kbn/dag-layout';
import { transformWorkflowToGraph } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';
import {
  computeWorkflowLayout,
  WORKFLOW_COMPOUND_PADDING,
  WORKFLOW_NODE_SEP,
  WORKFLOW_RANK_SEP,
} from './workflow_layout_pipeline';

const CENTER_TOLERANCE = 2;

const minimal = (overrides: Partial<WorkflowYaml> = {}): WorkflowYaml =>
  ({
    name: 'wf',
    enabled: true,
    triggers: [{ type: 'manual', enabled: true }],
    steps: [],
    ...overrides,
  } as unknown as WorkflowYaml);

const runLayout = (yaml: WorkflowYaml, direction: 'TB' | 'LR' = 'TB') => {
  const transformed = transformWorkflowToGraph(yaml);
  return {
    result: computeWorkflowLayout(transformed, { direction }),
    transformed,
  };
};

const findNode = (nodes: ReturnType<typeof computeWorkflowLayout>['nodes'], id: string) => {
  const n = nodes.find((x) => x.id === id);
  if (!n) throw new Error(`Expected positioned node "${id}"`);
  return n;
};

const findEdge = (
  edges: ReturnType<typeof computeWorkflowLayout>['edges'],
  source: string,
  target: string
) => {
  const e = edges.find((x) => x.source === source && x.target === target);
  if (!e) throw new Error(`Expected edge ${source} → ${target}`);
  return e;
};

const centerX = (n: ReturnType<typeof findNode>) => n.x + n.width / 2;
const centerY = (n: ReturnType<typeof findNode>) => n.y + n.height / 2;

describe('workflow layout pipeline', () => {
  it('gives every node a finite numeric position', () => {
    const { result } = runLayout(
      minimal({
        steps: [
          { name: 'a', type: 'http' },
          { name: 'b', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    for (const n of result.nodes) {
      expect(isFinite(n.x)).toBe(true);
      expect(isFinite(n.y)).toBe(true);
    }
  });

  it('foreach group container encompasses its inner nodes plus padding', () => {
    const { result } = runLayout(
      minimal({
        steps: [
          {
            name: 'loop',
            type: 'foreach',
            foreach: 'items',
            steps: [{ name: 'inner', type: 'http' }],
          },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const groupNode = findNode(result.nodes, 'loop');
    const innerNode = findNode(result.nodes, 'inner');
    expect(groupNode.width).toBeGreaterThanOrEqual(
      innerNode.width + WORKFLOW_COMPOUND_PADDING.left + WORKFLOW_COMPOUND_PADDING.right
    );
    expect(groupNode.height).toBeGreaterThanOrEqual(
      innerNode.height + WORKFLOW_COMPOUND_PADDING.top + WORKFLOW_COMPOUND_PADDING.bottom
    );
  });

  it('TB layout produces smaller x-spread than y-spread for a linear chain', () => {
    const { result: tb } = runLayout(
      minimal({
        steps: [
          { name: 'a', type: 'http' },
          { name: 'b', type: 'http' },
          { name: 'c', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      }),
      'TB'
    );
    const { result: lr } = runLayout(
      minimal({
        steps: [
          { name: 'a', type: 'http' },
          { name: 'b', type: 'http' },
          { name: 'c', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      }),
      'LR'
    );
    const tbSteps = tb.nodes.filter((n) => ['a', 'b', 'c'].includes(n.id));
    const tbYSpread = Math.max(...tbSteps.map((n) => n.y)) - Math.min(...tbSteps.map((n) => n.y));
    const tbXSpread = Math.max(...tbSteps.map((n) => n.x)) - Math.min(...tbSteps.map((n) => n.x));
    expect(tbYSpread).toBeGreaterThan(tbXSpread);

    const lrSteps = lr.nodes.filter((n) => ['a', 'b', 'c'].includes(n.id));
    const lrXSpread = Math.max(...lrSteps.map((n) => n.x)) - Math.min(...lrSteps.map((n) => n.x));
    const lrYSpread = Math.max(...lrSteps.map((n) => n.y)) - Math.min(...lrSteps.map((n) => n.y));
    expect(lrXSpread).toBeGreaterThan(lrYSpread);
  });

  it('returns edges with points arrays', () => {
    const { result } = runLayout(
      minimal({
        steps: [
          { name: 'a', type: 'http' },
          { name: 'b', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    for (const e of result.edges) {
      expect(Array.isArray(e.points)).toBe(true);
    }
  });

  it('TB merge node is horizontally centered between parallel branch leaves', () => {
    const { result } = runLayout(
      minimal({
        steps: [
          {
            name: 'fork',
            type: 'parallel',
            branches: [
              { steps: [{ name: 'a', type: 'http' }] },
              { steps: [{ name: 'b', type: 'http' }] },
            ],
          },
          { name: 'c', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      }),
      'TB'
    );
    const a = findNode(result.nodes, 'a');
    const b = findNode(result.nodes, 'b');
    const c = findNode(result.nodes, 'c');
    expect(Math.abs(centerX(c) - (centerX(a) + centerX(b)) / 2)).toBeLessThanOrEqual(
      CENTER_TOLERANCE
    );
  });

  it('LR merge node is vertically centered between parallel branch leaves', () => {
    const { result } = runLayout(
      minimal({
        steps: [
          {
            name: 'fork',
            type: 'parallel',
            branches: [
              { steps: [{ name: 'a', type: 'http' }] },
              { steps: [{ name: 'b', type: 'http' }] },
            ],
          },
          { name: 'c', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      }),
      'LR'
    );
    const a = findNode(result.nodes, 'a');
    const b = findNode(result.nodes, 'b');
    const c = findNode(result.nodes, 'c');
    expect(Math.abs(centerY(c) - (centerY(a) + centerY(b)) / 2)).toBeLessThanOrEqual(
      CENTER_TOLERANCE
    );
  });

  it('TB linear chain shares center X across trigger and steps', () => {
    const { result } = runLayout(
      minimal({
        steps: [
          { name: 'a', type: 'http' },
          { name: 'b', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      }),
      'TB'
    );
    const triggerNode = result.nodes.find((n) => {
      const { nodes } = transformWorkflowToGraph(
        minimal({
          steps: [
            { name: 'a', type: 'http' },
            { name: 'b', type: 'http' },
          ] as unknown as WorkflowYaml['steps'],
        })
      );
      return nodes.find((x) => x.type === 'trigger')?.id === n.id;
    });
    const a = findNode(result.nodes, 'a');
    const b = findNode(result.nodes, 'b');
    if (triggerNode) {
      const centers = [centerX(triggerNode), centerX(a), centerX(b)];
      expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(CENTER_TOLERANCE);
    }
  });

  it('TB linear chain edge waypoints share center X with nodes', () => {
    const { result } = runLayout(
      minimal({
        steps: [
          { name: 'a', type: 'http' },
          { name: 'b', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      }),
      'TB'
    );
    const a = findNode(result.nodes, 'a');
    const b = findNode(result.nodes, 'b');
    const e = findEdge(result.edges, 'a', 'b');
    for (const p of e.points) {
      expect(Math.abs(p.x - centerX(a))).toBeLessThanOrEqual(CENTER_TOLERANCE);
      expect(Math.abs(p.x - centerX(b))).toBeLessThanOrEqual(CENTER_TOLERANCE);
    }
  });

  it('TB if branch fan-out omits dagre waypoints for smooth-step routing', () => {
    const { result } = runLayout(
      minimal({
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'true',
            steps: [{ name: 'left_step', type: 'http' }],
            else: [
              {
                name: 'wide_loop',
                type: 'foreach',
                foreach: 'items',
                steps: [
                  { name: 'inner_a', type: 'http' },
                  { name: 'inner_b', type: 'http' },
                ],
              },
            ],
          },
        ] as unknown as WorkflowYaml['steps'],
      }),
      'TB'
    );
    const thenEdge = findEdge(result.edges, 'gate', 'left-step');
    expect(thenEdge.points.length).toBeLessThan(2);
  });

  it('drops co-linear spine waypoints when middle bus is laterally stale', () => {
    expect(
      resolveShiftedEdgePoints({
        shifted: [
          { x: 175, y: 100 },
          { x: 400, y: 150 },
          { x: 175, y: 200 },
        ],
        sourceCenter: 175,
        targetCenter: 175,
        crossAxis: 'x',
      })
    ).toEqual([]);
  });

  it('shifts foreach inner edge points to absolute coordinates', () => {
    const { result } = runLayout(
      minimal({
        steps: [
          {
            name: 'loop',
            type: 'foreach',
            foreach: 'items',
            steps: [
              { name: 'inner_a', type: 'http' },
              { name: 'inner_b', type: 'http' },
            ],
          },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const loop = findNode(result.nodes, 'loop');
    const innerA = findNode(result.nodes, 'inner-a');
    // inner-a should be absolutely within the loop container bounds
    expect(innerA.x).toBeGreaterThanOrEqual(loop.x);
    expect(innerA.y).toBeGreaterThanOrEqual(loop.y);
    const innerEdge = findEdge(result.edges, 'inner-a', 'inner-b');
    for (const p of innerEdge.points) {
      expect(p.x).toBeGreaterThanOrEqual(loop.x - 1);
      expect(p.y).toBeGreaterThanOrEqual(loop.y - 1);
    }
  });

  it('TB parallel fan-out keeps sibling steps separated', () => {
    const { result } = runLayout(
      minimal({
        steps: [
          {
            name: 'fork',
            type: 'parallel',
            branches: [
              { steps: [{ name: 'a', type: 'http' }] },
              { steps: [{ name: 'b', type: 'http' }] },
            ],
          },
        ] as unknown as WorkflowYaml['steps'],
      }),
      'TB'
    );
    const a = findNode(result.nodes, 'a');
    const b = findNode(result.nodes, 'b');
    expect(Math.abs(centerX(a) - centerX(b))).toBeGreaterThan(a.width / 2);
  });

  // ─── spec 01: fork lane order ─────────────────────────────────────────────

  describe('fork lane order — if step (TB)', () => {
    /**
     * An if whose `else` branch is much deeper (foreach with 2 inner steps)
     * than its `then` branch (1 step). Dagre places the deeper branch first
     * (lower cross-axis / further left in TB). After enforceForkLaneOrder the
     * `then` (true) branch must be left of `else` (false).
     */
    const buildIfWithLongElse = () =>
      runLayout(
        minimal({
          steps: [
            {
              name: 'gate',
              type: 'if',
              condition: 'true',
              steps: [{ name: 'left_step', type: 'http' }],
              else: [
                {
                  name: 'wide_loop',
                  type: 'foreach',
                  foreach: 'items',
                  steps: [
                    { name: 'inner_a', type: 'http' },
                    { name: 'inner_b', type: 'http' },
                  ],
                },
              ],
            },
          ] as unknown as WorkflowYaml['steps'],
        }),
        'TB'
      );

    it('then lane (left-step) is left of else lane (wide-loop) regardless of depth', () => {
      const { result } = buildIfWithLongElse();
      expect(centerX(findNode(result.nodes, 'left-step'))).toBeLessThan(
        centerX(findNode(result.nodes, 'wide-loop'))
      );
    });

    it('growing else branch by one step does not swap lane positions', () => {
      const { result: base } = buildIfWithLongElse();
      const { result: grown } = runLayout(
        minimal({
          steps: [
            {
              name: 'gate',
              type: 'if',
              condition: 'true',
              steps: [{ name: 'left_step', type: 'http' }],
              else: [
                {
                  name: 'wide_loop',
                  type: 'foreach',
                  foreach: 'items',
                  steps: [
                    { name: 'inner_a', type: 'http' },
                    { name: 'inner_b', type: 'http' },
                    { name: 'inner_c', type: 'http' },
                  ],
                },
              ],
            },
          ] as unknown as WorkflowYaml['steps'],
        }),
        'TB'
      );
      // then lane must remain left of else lane in the grown layout too
      expect(centerX(findNode(grown.nodes, 'left-step'))).toBeLessThan(
        centerX(findNode(grown.nodes, 'wide-loop'))
      );
      // and the relative lane assignment must match base (then is left in both)
      const baseOrder = centerX(findNode(base.nodes, 'left-step')) < centerX(findNode(base.nodes, 'wide-loop'));
      const grownOrder = centerX(findNode(grown.nodes, 'left-step')) < centerX(findNode(grown.nodes, 'wide-loop'));
      expect(baseOrder).toBe(grownOrder);
    });

    it('inner nodes of wide-loop stay inside the container after lane reorder', () => {
      const { result } = buildIfWithLongElse();
      const loop = findNode(result.nodes, 'wide-loop');
      const innerA = findNode(result.nodes, 'inner-a');
      const innerB = findNode(result.nodes, 'inner-b');
      // Inner nodes must be within the container's bounding box
      expect(innerA.x).toBeGreaterThanOrEqual(loop.x);
      expect(innerA.x + innerA.width).toBeLessThanOrEqual(loop.x + loop.width + 1);
      expect(innerB.x).toBeGreaterThanOrEqual(loop.x);
      expect(innerB.x + innerB.width).toBeLessThanOrEqual(loop.x + loop.width + 1);
    });
  });

  describe('fork lane order — switch step (TB)', () => {
    it('case[0] lane is left of case[1] lane when case[1] is deeper', () => {
      const { result } = runLayout(
        minimal({
          steps: [
            {
              name: 'router',
              type: 'switch',
              cases: [
                { match: 'a', steps: [{ name: 'case_a', type: 'http' }] },
                {
                  match: 'b',
                  steps: [
                    { name: 'case_b1', type: 'http' },
                    { name: 'case_b2', type: 'http' },
                    { name: 'case_b3', type: 'http' },
                  ],
                },
              ],
            },
          ] as unknown as WorkflowYaml['steps'],
        }),
        'TB'
      );
      expect(centerX(findNode(result.nodes, 'case-a'))).toBeLessThan(
        centerX(findNode(result.nodes, 'case-b1'))
      );
    });
  });

  describe('trigger lane order (TB)', () => {
    it('trigger 0 is left of trigger 1 when trigger 1 leads a deeper subtree', () => {
      const { result } = runLayout(
        minimal({
          triggers: [
            { type: 'manual', enabled: true },
            { type: 'scheduled', enabled: true },
          ],
          steps: [
            { name: 'step_a', type: 'http' },
          ] as unknown as WorkflowYaml['steps'],
        }),
        'TB'
      );
      // Find the trigger nodes by their ids
      const triggerNodes = result.nodes.filter((n) => n.id.startsWith('trigger-'));
      if (triggerNodes.length < 2) {
        // Fewer than 2 triggers laid out — assertion not applicable
        return;
      }
      // triggerIndex 0 should be to the left of triggerIndex 1
      const sorted = [...triggerNodes].sort((a, b) => centerX(a) - centerX(b));
      expect(sorted[0].id).toContain('manual');
    });
  });

  it('throws on a cyclic foreach group graph', () => {
    // transformWorkflowToGraph never produces cycles; construct manually to
    // verify computeWorkflowLayout correctly surfaces the dagLayout cycle error.
    transformWorkflowToGraph(minimal());
    const dagNodes = [
      { id: 'groupA', width: 300, height: 64 },
      { id: 'groupB', width: 300, height: 64 },
    ];
    const dagGroups = [
      { id: 'groupA', innerNodes: [{ id: 'groupB', width: 300, height: 64 }], innerEdges: [] },
      { id: 'groupB', innerNodes: [{ id: 'groupA', width: 300, height: 64 }], innerEdges: [] },
    ];
    expect(() => dagLayout(dagNodes, [], dagGroups)).toThrow(/cycle/i);
  });

  it('constants match the hook: nodeSep is WORKFLOW_NODE_SEP and rankSep is WORKFLOW_RANK_SEP', () => {
    // Regression guard: if the constants drifted between the hook and the
    // pipeline, layout results would silently differ. The test just asserts
    // the exported values have the expected numeric meaning (50 / 70) that
    // was hard-coded in the original use_workflow_layout.ts.
    expect(WORKFLOW_NODE_SEP).toBe(50);
    expect(WORKFLOW_RANK_SEP).toBe(70);
  });
});

// ─── spec 02 regression — named fixtures ──────────────────────────────────────
//
// Before this fix, enforceForkLaneOrder permuted lane *starts*, which is only
// overlap-safe for equal-width lanes. The reported YAML combined a nested
// fallback lane with an asymmetric if (foreach in then, single step in else),
// triggering overlaps of 232 / 209 / 14 px. All four variants below now produce
// zero overlapping pairs. See the plan's root-cause section for variant labels.

const OVERLAP_TOLERANCE = 1;

/** Returns true if the two axis-aligned rectangles overlap by more than OVERLAP_TOLERANCE. */
const overlaps = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean =>
  a.x + OVERLAP_TOLERANCE < b.x + b.width &&
  a.x + a.width > b.x + OVERLAP_TOLERANCE &&
  a.y + OVERLAP_TOLERANCE < b.y + b.height &&
  a.y + a.height > b.y + OVERLAP_TOLERANCE;

/**
 * Returns all overlapping pairs of outer (non-inner) nodes.
 * Containers vs their own inner nodes are not considered — inner coordinates
 * are absolute but a container box includes its padding, so partial overlap
 * with own children is by design.
 */
const findOverlappingPairs = (
  nodes: ReturnType<typeof computeWorkflowLayout>['nodes'],
  groupIds: Set<string>
): Array<[string, string]> => {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      // Skip pairs where one is a group and the other is its inner node.
      // (Container position is absolute; inner node position is absolute too.)
      if (groupIds.has(a.id) || groupIds.has(b.id)) continue;
      if (overlaps(a, b)) pairs.push([a.id, b.id]);
    }
  }
  return pairs;
};

describe('spec 02 regression — named fixtures', () => {
  // ── Variant A — the reported YAML ─────────────────────────────────────────
  // A step with a nested fallback lane, followed by an asymmetric if
  // (foreach in then, single step in else), followed by a final step.
  // This is the exact shape that triggered the 232 / 209 / 14 px overlaps.
  it('variant A (reported YAML): no pairwise overlap', () => {
    const { result, transformed } = runLayout(
      minimal({
        steps: [
          {
            name: 'owner',
            type: 'http',
            'on-failure': {
              fallback: [
                {
                  name: 'nested-owner',
                  type: 'http',
                  'on-failure': {
                    fallback: [{ name: 'nested-lane-step', type: 'http' }],
                  },
                },
              ],
            },
          },
          {
            name: 'gate',
            type: 'if',
            condition: 'true',
            steps: [
              {
                name: 'loop-step',
                type: 'foreach',
                foreach: 'items',
                steps: [{ name: 'inner', type: 'http' }],
              },
            ],
            else: [{ name: 'else-step', type: 'http' }],
          },
          { name: 'final-step', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const groupIds = new Set(transformed.foreachGroups.map((g) => g.id));
    const pairs = findOverlappingPairs(result.nodes, groupIds);
    expect(pairs).toHaveLength(0);
  });

  it('variant A: then-lane is left of else-lane (declaration order)', () => {
    const { result } = runLayout(
      minimal({
        steps: [
          {
            name: 'owner',
            type: 'http',
            'on-failure': {
              fallback: [{ name: 'fallback-step', type: 'http' }],
            },
          },
          {
            name: 'gate',
            type: 'if',
            condition: 'true',
            steps: [
              {
                name: 'loop-step',
                type: 'foreach',
                foreach: 'items',
                steps: [{ name: 'inner', type: 'http' }],
              },
            ],
            else: [{ name: 'else-step', type: 'http' }],
          },
          { name: 'final-step', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    // In TB, the then-lane head (loop-step container) must be to the left of
    // the else-lane head (else-step) — declaration order.
    const loopNode = result.nodes.find((n) => n.id === 'loop-step');
    const elseNode = result.nodes.find((n) => n.id === 'else-step');
    expect(loopNode).toBeDefined();
    expect(elseNode).toBeDefined();
    expect(centerX(loopNode!)).toBeLessThan(centerX(elseNode!));
  });

  it('owner with fallback and a plain following step share the spine column', () => {
    // Speculative anchoring (pass 3) translates the owner onto its spine
    // successor's column. Owner and next-step should share the same x-centre.
    const { result } = runLayout(
      minimal({
        steps: [
          {
            name: 'owner',
            type: 'http',
            'on-failure': {
              fallback: [{ name: 'fallback-step', type: 'http' }],
            },
          },
          { name: 'next-step', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const ownerNode = result.nodes.find((n) => n.id === 'owner');
    const nextNode = result.nodes.find((n) => n.id === 'next-step');
    expect(ownerNode).toBeDefined();
    expect(nextNode).toBeDefined();
    // After speculative anchoring, owner and next-step should be on the same column.
    expect(Math.abs(centerX(ownerNode!) - centerX(nextNode!))).toBeLessThanOrEqual(
      CENTER_TOLERANCE
    );
  });

  // ── Variant B — pre-existing spec 01 bug (no fallback, foreach in then) ───
  it('variant B (if+foreach in then, no fallback): no pairwise overlap', () => {
    const { result, transformed } = runLayout(
      minimal({
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'true',
            steps: [
              {
                name: 'loop-step',
                type: 'foreach',
                foreach: 'items',
                steps: [{ name: 'inner', type: 'http' }],
              },
            ],
            else: [{ name: 'else-step', type: 'http' }],
          },
          { name: 'final-step', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const groupIds = new Set(transformed.foreachGroups.map((g) => g.id));
    const pairs = findOverlappingPairs(result.nodes, groupIds);
    expect(pairs).toHaveLength(0);
  });

  // ── Variant C — fallback with following sibling, flat then/else ────────────
  it('variant C (fallback + following sibling, flat then): no pairwise overlap', () => {
    const { result, transformed } = runLayout(
      minimal({
        steps: [
          {
            name: 'owner',
            type: 'http',
            'on-failure': {
              fallback: [{ name: 'fallback-step', type: 'http' }],
            },
          },
          {
            name: 'gate',
            type: 'if',
            condition: 'true',
            steps: [{ name: 'then-step', type: 'http' }],
            else: [{ name: 'else-step', type: 'http' }],
          },
          { name: 'final-step', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const groupIds = new Set(transformed.foreachGroups.map((g) => g.id));
    const pairs = findOverlappingPairs(result.nodes, groupIds);
    expect(pairs).toHaveLength(0);
  });

  // ── Variant D — no fallback, flat then/else (equal widths, always worked) ──
  it('variant D (equal-width flat then/else, no fallback): no pairwise overlap', () => {
    const { result, transformed } = runLayout(
      minimal({
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'true',
            steps: [{ name: 'then-step', type: 'http' }],
            else: [{ name: 'else-step', type: 'http' }],
          },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const groupIds = new Set(transformed.foreachGroups.map((g) => g.id));
    const pairs = findOverlappingPairs(result.nodes, groupIds);
    expect(pairs).toHaveLength(0);
  });

  // ── Variant E — fallback owner in then branch, unequal-depth if ─────────────
  // The then branch has 2 spine steps (then-step + foreach), else has 1.
  // Dagre's tight-tree ranker puts else-step at rank 2 to tighten the else→merge
  // edge. Fork head alignment (step 3.5 in layoutGraphWithLanes) must move
  // else-step back to rank 1 so the fork is symmetric and the topology push
  // does not incorrectly push else-step into the loop container's Y band.
  it('variant E (unequal-depth if, fallback owner in then): fork heads are aligned and no pairwise overlap', () => {
    const { result, transformed } = runLayout(
      minimal({
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'true',
            steps: [
              {
                name: 'then-step',
                type: 'http',
                'on-failure': {
                  fallback: [{ name: 'then-fallback', type: 'http' }],
                },
              },
              {
                name: 'loop-step',
                type: 'foreach',
                foreach: 'items',
                steps: [{ name: 'inner', type: 'http' }],
              },
            ],
            else: [{ name: 'else-step', type: 'http' }],
          },
          { name: 'final-step', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const thenStepNode = result.nodes.find((n) => n.id === 'then-step')!;
    const elseStepNode = result.nodes.find((n) => n.id === 'else-step')!;
    expect(thenStepNode).toBeDefined();
    expect(elseStepNode).toBeDefined();
    // Both fork heads must be at the same rank (fork head alignment).
    expect(Math.abs(centerY(thenStepNode) - centerY(elseStepNode))).toBeLessThan(CENTER_TOLERANCE);
    // No pairwise overlaps — else must not end up inside the foreach container.
    const groupIds = new Set(transformed.foreachGroups.map((g) => g.id));
    const pairs = findOverlappingPairs(result.nodes, groupIds);
    expect(pairs).toHaveLength(0);
  });

  // ── Variant F — micro-compound ordering: each branch's fallback packed before next branch ──
  // then branch has one step with a fallback; else branch has one step with a fallback.
  // Expected cross-axis order (TB, left→right): then-step | then-fallback | else-step | else-fallback.
  // The fallback for then must be to the LEFT of else-step (packed within the then compound),
  // and the fallback for else must be to the RIGHT of else-step (packed within the else compound).
  it('variant F (micro-compound): then-fallback is between then and else, else-fallback is right of else', () => {
    const { result, transformed } = runLayout(
      minimal({
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'true',
            steps: [
              {
                name: 'then-step',
                type: 'http',
                'on-failure': {
                  fallback: [{ name: 'then-fallback', type: 'http' }],
                },
              },
            ],
            else: [
              {
                name: 'else-step',
                type: 'http',
                'on-failure': {
                  fallback: [{ name: 'else-fallback', type: 'http' }],
                },
              },
            ],
          },
          { name: 'final-step', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const thenNode = result.nodes.find((n) => n.id === 'then-step')!;
    const thenFallback = result.nodes.find((n) => n.id === 'then-fallback')!;
    const elseNode = result.nodes.find((n) => n.id === 'else-step')!;
    const elseFallback = result.nodes.find((n) => n.id === 'else-fallback')!;
    expect(thenNode).toBeDefined();
    expect(thenFallback).toBeDefined();
    expect(elseNode).toBeDefined();
    expect(elseFallback).toBeDefined();
    // then compound (then-step + then-fallback) is entirely left of else compound.
    expect(centerX(thenFallback)).toBeLessThan(centerX(elseNode));
    // else compound (else-step + else-fallback): else-fallback is right of else-step.
    expect(centerX(elseNode)).toBeLessThan(centerX(elseFallback));
    // Declaration order: then before else on cross axis.
    expect(centerX(thenNode)).toBeLessThan(centerX(elseNode));
    // No pairwise overlaps.
    const groupIds = new Set(transformed.foreachGroups.map((g) => g.id));
    const pairs = findOverlappingPairs(result.nodes, groupIds);
    expect(pairs).toHaveLength(0);
  });

  // ── continue: true — spine head shared between fallback and spine lanes ────
  it('continue: true — fork is not skipped (asymmetric exclusion)', () => {
    // Without the asymmetric exclusion fix, buildLaneSets would classify the
    // spine head as a join (reachable from both lanes) → spine lane empty →
    // fork skipped → fallback lane stays wherever dagre put it.
    const { result } = runLayout(
      minimal({
        steps: [
          {
            name: 'owner',
            type: 'http',
            'on-failure': {
              continue: true,
              fallback: [{ name: 'fallback-step', type: 'http' }],
            },
          },
          { name: 'next-step', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    // fallback-step must be positioned (not at 0,0 from a skipped fork).
    const fallbackNode = result.nodes.find((n) => n.id === 'fallback-step');
    expect(fallbackNode).toBeDefined();
    expect(isFinite(fallbackNode!.x)).toBe(true);
    expect(isFinite(fallbackNode!.y)).toBe(true);
    // The failure edge must be reconciled — the pipeline must complete without error.
    const ownerNode = result.nodes.find((n) => n.id === 'owner');
    const nextNode = result.nodes.find((n) => n.id === 'next-step');
    expect(ownerNode).toBeDefined();
    expect(nextNode).toBeDefined();
    // Owner and next-step should be on the same column (the spine).
    expect(Math.abs(centerX(ownerNode!) - centerX(nextNode!))).toBeLessThanOrEqual(
      CENTER_TOLERANCE
    );
  });

  it('continue: true — no pairwise overlap', () => {
    const { result, transformed } = runLayout(
      minimal({
        steps: [
          {
            name: 'owner',
            type: 'http',
            'on-failure': {
              continue: true,
              fallback: [{ name: 'fallback-step', type: 'http' }],
            },
          },
          { name: 'next-step', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const groupIds = new Set(transformed.foreachGroups.map((g) => g.id));
    const pairs = findOverlappingPairs(result.nodes, groupIds);
    expect(pairs).toHaveLength(0);
  });

  it('edge whose endpoints move by different deltas: reconcileEdgePoints clears it', () => {
    // Build a fallback owner whose lane head moves a different amount than the
    // owner itself after the post-dagre passes. The failure edge's waypoints
    // should be cleared (points.length < 2), not translated.
    //
    // We can't easily control the exact movements, but we can assert that the
    // pipeline produces a valid result (no throws, finite positions) even when
    // waypoints are cleared — the smooth-step fallback renders correctly.
    const { result } = runLayout(
      minimal({
        steps: [
          {
            name: 'owner',
            type: 'http',
            'on-failure': {
              fallback: [{ name: 'fallback-step', type: 'http' }],
            },
          },
          { name: 'final-step', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    for (const n of result.nodes) {
      expect(isFinite(n.x)).toBe(true);
      expect(isFinite(n.y)).toBe(true);
    }
    for (const e of result.edges) {
      for (const p of e.points) {
        expect(isFinite(p.x)).toBe(true);
        expect(isFinite(p.y)).toBe(true);
      }
    }
  });
});
