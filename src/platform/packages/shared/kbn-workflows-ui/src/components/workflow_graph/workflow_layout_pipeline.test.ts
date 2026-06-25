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
 *   transformWorkflowToGraph → map to DagNode[] → dagLayout → assert positions.
 *
 * Adapted from apply_graph_layout.test.ts (previously in @kbn/workflows) to
 * validate the mapping adapter introduced by this extraction. Both this suite
 * and @kbn/dag-layout's raw-fixture suite coexist; a follow-up will evaluate
 * overlap and decide what to trim.
 */

import { dagLayout, resolveShiftedEdgePoints } from '@kbn/dag-layout';
import { transformWorkflowToGraph } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';

// Workflow-specific padding — matches the constants in use_workflow_layout.ts.
const COMPOUND_PADDING = { top: 70, right: 32, bottom: 32, left: 32 } as const;
const NODE_SEP = 50;
const RANK_SEP = 70;

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
  const { nodes, edges, foreachGroups, bypassLaneNodes } = transformWorkflowToGraph(yaml);
  const dagNodes = [
    ...nodes.map((n) => ({ id: n.id, width: n.style.width, height: n.style.height })),
    ...bypassLaneNodes.map((n) => ({ id: n.id, width: n.style.width, height: n.style.height })),
  ];
  const dagEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
  const dagGroups = foreachGroups.map((g) => ({
    id: g.id,
    innerNodes: [
      ...g.innerNodes.map((n) => ({ id: n.id, width: n.style.width, height: n.style.height })),
      ...g.bypassLaneNodes.map((n) => ({
        id: n.id,
        width: n.style.width,
        height: n.style.height,
      })),
    ],
    innerEdges: g.innerEdges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  }));
  return {
    result: dagLayout(dagNodes, dagEdges, dagGroups, {
      direction,
      nodeSep: NODE_SEP,
      rankSep: RANK_SEP,
      compoundPadding: COMPOUND_PADDING,
    }),
    foreachGroups,
  };
};

const findNode = (nodes: ReturnType<typeof dagLayout>['nodes'], id: string) => {
  const n = nodes.find((x) => x.id === id);
  if (!n) throw new Error(`Expected positioned node "${id}"`);
  return n;
};

const findEdge = (edges: ReturnType<typeof dagLayout>['edges'], source: string, target: string) => {
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
      innerNode.width + COMPOUND_PADDING.left + COMPOUND_PADDING.right
    );
    expect(groupNode.height).toBeGreaterThanOrEqual(
      innerNode.height + COMPOUND_PADDING.top + COMPOUND_PADDING.bottom
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
    const trigger = result.nodes.find((n) => {
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
    if (trigger) {
      const centers = [centerX(trigger), centerX(a), centerX(b)];
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

  it('throws on a cyclic foreach group graph', () => {
    // transformWorkflowToGraph never produces cycles; construct manually to
    // verify the adapter correctly surfaces the dagLayout cycle error.
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
});
