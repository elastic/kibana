/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Invariant: every wire-control button must:
 *   R1 – not overlap a step or trigger node card.
 *   R2 – for fork-head terminals, sit at least WIRE_CONTROL_CLEARANCE below the
 *        chip bottom (segmentStart.y).
 *   R3 – for branch-tail terminals, sit at least WIRE_CONTROL_CLEARANCE above the
 *        merge bus (target entry − MERGE_BUS_TRUNK).
 *
 * These tests are written RED-first: they describe invariants that are violated
 * by the current code and serve as the acceptance criterion for the fix.
 */

import type { Edge, Node } from '@xyflow/react';
import { transformWorkflowToGraph } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';
import { MERGE_BUS_TRUNK } from './compute_edge_path';
import { computeInsertionPoints } from './compute_insertion_points';
import {
  absoluteNodeBounds,
  computeWireInsertionControls,
} from './compute_wire_insertion_controls';
import { computeWorkflowLayout } from './workflow_layout_pipeline';

// ── constants (stay in sync with the production values) ──────────────────────
const WIRE_CONTROL_SIZE = 22; // from workflow_graph_wire_split_control.tsx
const WIRE_CONTROL_CLEARANCE = 14;

// ── helpers ───────────────────────────────────────────────────────────────────

const minimal = (overrides: Partial<WorkflowYaml> = {}): WorkflowYaml =>
  ({
    name: 'wf',
    enabled: true,
    triggers: [{ type: 'manual', enabled: true }],
    steps: [],
    ...overrides,
  } as unknown as WorkflowYaml);

/**
 * Convert DagPositionedNode[] to minimal React Flow Node[] so absoluteNodeBounds
 * works. Inner nodes of foreach groups have positions relative to the parent —
 * exactly what use_workflow_layout.ts does at runtime.
 */
const toReactFlowNodes = (
  transformed: ReturnType<typeof transformWorkflowToGraph>,
  layout: ReturnType<typeof computeWorkflowLayout>
): Node[] => {
  const positionedById = new Map(layout.nodes.map((n) => [n.id, n]));

  // Build innerNodeToGroupId from the transform (mirrors use_workflow_layout.ts).
  const innerNodeToGroupId = new Map<string, string>();
  for (const g of transformed.foreachGroups) {
    for (const n of g.innerNodes) innerNodeToGroupId.set(n.id, g.id);
    for (const n of g.bypassLaneNodes) innerNodeToGroupId.set(n.id, g.id);
  }

  const allIds = [
    ...transformed.nodes.map((n) => n.id),
    ...transformed.bypassLaneNodes.map((n) => n.id),
    ...transformed.foreachGroups.flatMap((g) => [
      ...g.innerNodes.map((n) => n.id),
      ...g.bypassLaneNodes.map((n) => n.id),
    ]),
  ];

  return allIds.flatMap((id) => {
    const pos = positionedById.get(id);
    if (!pos) return [];
    const parentId = innerNodeToGroupId.get(id);
    const parentPos = parentId ? positionedById.get(parentId) : undefined;
    const position = parentPos
      ? { x: pos.x - parentPos.x, y: pos.y - parentPos.y }
      : { x: pos.x, y: pos.y };
    // Derive a minimal type so card checks work: step or trigger from nodeRefs.
    const ref = transformed.nodeRefs[id];
    const type =
      ref?.kind === 'trigger'
        ? 'trigger'
        : id.includes('bypass') || id.includes('join')
        ? 'bypassLane'
        : transformed.foreachGroups.some((g) => g.id === id)
        ? 'foreachGroup'
        : 'step';
    return [{ id, type, position, parentId, width: pos.width, height: pos.height } as Node];
  });
};

/**
 * Build React Flow edges with `data.branchType` / `data.branchIndex` / `data.isMerge`
 * so that `isForkEdge` / `isMergeEdge` work inside computeWireInsertionControls.
 * The layout edges (DagPositionedEdge) only carry waypoints, not domain data.
 * Mirrors the edge-mapping logic in use_workflow_layout.ts.
 */
const toReactFlowEdges = (transformed: ReturnType<typeof transformWorkflowToGraph>): Edge[] => {
  const allDomainEdges = [
    ...transformed.edges,
    ...transformed.foreachGroups.flatMap((g) => g.innerEdges),
  ];
  // Build mergeNodeIds: targets with more than one incoming edge (fan-in).
  const incomingCount = new Map<string, number>();
  for (const e of allDomainEdges) {
    incomingCount.set(e.target, (incomingCount.get(e.target) ?? 0) + 1);
  }
  const mergeNodeIds = new Set(
    [...incomingCount.entries()].filter(([, c]) => c > 1).map(([id]) => id)
  );
  return allDomainEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    data: {
      branchType: e.branchType,
      branchIndex: e.branchIndex,
      label: e.label,
      isMerge: mergeNodeIds.has(e.target),
      isFailure: e.isFailure,
    },
  })) as unknown as Edge[];
};

const runLayout = (yaml: WorkflowYaml) => {
  const transformed = transformWorkflowToGraph(yaml);
  const layout = computeWorkflowLayout(transformed, { direction: 'TB' });
  const rfNodes = toReactFlowNodes(transformed, layout);
  const rfEdges = toReactFlowEdges(transformed);
  const insertionPoints = computeInsertionPoints(yaml, transformed);
  const controls = computeWireInsertionControls({
    nodes: rfNodes,
    edges: rfEdges,
    insertionPoints,
    direction: 'TB',
    forkNodeToJoinId: transformed.forkNodeToJoinId,
  });
  return { layout, rfNodes, rfEdges, transformed, insertionPoints, controls };
};

/** Half-size button box around a centre point. */
const btnBox = (cx: number, cy: number) => ({
  l: cx - WIRE_CONTROL_SIZE / 2,
  r: cx + WIRE_CONTROL_SIZE / 2,
  t: cy - WIRE_CONTROL_SIZE / 2,
  b: cy + WIRE_CONTROL_SIZE / 2,
});

/** True when two [min, max] intervals overlap. */
const intervalsOverlap = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && a1 > b0;

const cardNodes = (nodes: Node[]) => nodes.filter((n) => n.type === 'step' || n.type === 'trigger');

interface R1Violation {
  ctrlId: string;
  nodeId: string;
}

interface R2Violation {
  ctrlId: string;
  chipBottom: number;
  btnTop: number;
}

interface R3Violation {
  ctrlId: string;
  busY: number;
  btnBottom: number;
}

const checkPlacements = (
  controls: ReturnType<typeof computeWireInsertionControls>,
  nodes: Node[],
  edges: Edge[]
): { r1: R1Violation[]; r2: R2Violation[]; r3: R3Violation[] } => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edgeById = new Map(edges.map((e) => [e.id, e]));
  const cards = cardNodes(nodes);
  const r1: R1Violation[] = [];
  const r2: R2Violation[] = [];
  const r3: R3Violation[] = [];

  for (const ctrl of controls) {
    const btn = btnBox(ctrl.centre.x, ctrl.centre.y);

    // R1: fork-head + must not overlap any card.
    // The fork-head + sits between the branch chip and the branch's first card.
    // It must not reach into the card it is supposed to sit above.
    // (Branch-body tail controls can legitimately share an x-range with
    // neighbouring-branch cards at the same rank; that is not the reported bug.)
    if (ctrl.id.startsWith('terminal:fork:')) {
      for (const card of cards) {
        const ab = absoluteNodeBounds(card, byId);
        if (
          intervalsOverlap(btn.l, btn.r, ab.x, ab.x + ab.width) &&
          intervalsOverlap(btn.t, btn.b, ab.y, ab.y + ab.height)
        ) {
          r1.push({ ctrlId: ctrl.id, nodeId: card.id });
        }
      }
    }

    // R2: fork-head chip clearance.
    if (ctrl.id.startsWith('terminal:fork:')) {
      const chipBottom = ctrl.segmentStart.y;
      const btnTop = btn.t;
      if (btnTop < chipBottom + WIRE_CONTROL_CLEARANCE) {
        r2.push({ ctrlId: ctrl.id, chipBottom, btnTop });
      }
    }

    // R3: branch-tail above merge bus.
    if (ctrl.id.startsWith('terminal:branch-tail:')) {
      // ctrl.id is terminal:branch-tail:${edge.id}
      const edgeId = ctrl.id.slice('terminal:branch-tail:'.length);
      const edge = edgeById.get(edgeId);
      if (edge) {
        const tgt = byId.get(edge.target);
        if (tgt) {
          const tgtBounds = absoluteNodeBounds(tgt, byId);
          const busY = tgtBounds.y - MERGE_BUS_TRUNK;
          if (btn.b > busY - WIRE_CONTROL_CLEARANCE) {
            r3.push({ ctrlId: ctrl.id, busY, btnBottom: btn.b });
          }
        }
      }
    }
  }

  return { r1, r2, r3 };
};

// ── fixtures ──────────────────────────────────────────────────────────────────

describe('wire control placement — R1/R2/R3 invariants', () => {
  describe('if (then only)', () => {
    const wf = minimal({
      steps: [
        {
          name: 'gate',
          type: 'if',
          condition: 'true',
          steps: [{ name: 'then-step', type: 'http' }],
        },
      ] as unknown as WorkflowYaml['steps'],
    });

    it('R1: no fork-head + overlaps a card', () => {
      const { rfNodes, rfEdges, controls } = runLayout(wf);
      const { r1 } = checkPlacements(controls, rfNodes, rfEdges);
      expect(r1).toHaveLength(0);
    });

    it('R2: fork-head + sits below chip with clearance', () => {
      const { rfNodes, rfEdges, controls } = runLayout(wf);
      const { r2 } = checkPlacements(controls, rfNodes, rfEdges);
      expect(r2).toHaveLength(0);
    });
  });

  describe('if/else', () => {
    const wf = minimal({
      steps: [
        {
          name: 'gate',
          type: 'if',
          condition: 'true',
          steps: [{ name: 'then-step', type: 'http' }],
          else: [{ name: 'else-step', type: 'http' }],
        },
      ] as unknown as WorkflowYaml['steps'],
    });

    it('R1: no fork-head + overlaps a card', () => {
      const { rfNodes, rfEdges, controls } = runLayout(wf);
      const { r1 } = checkPlacements(controls, rfNodes, rfEdges);
      expect(r1).toHaveLength(0);
    });

    it('R3: branch-tail + stays above merge bus', () => {
      const { rfNodes, rfEdges, controls } = runLayout(wf);
      const { r3 } = checkPlacements(controls, rfNodes, rfEdges);
      expect(r3).toHaveLength(0);
    });
  });

  describe('parallel with 2 branches', () => {
    const wf = minimal({
      steps: [
        {
          name: 'par',
          type: 'parallel',
          branches: [
            { name: 'a', steps: [{ name: 'step-a', type: 'http' }] },
            { name: 'b', steps: [{ name: 'step-b', type: 'http' }] },
          ],
        },
      ] as unknown as WorkflowYaml['steps'],
    });

    it('R1: no fork-head + overlaps a card', () => {
      const { rfNodes, rfEdges, controls } = runLayout(wf);
      const { r1 } = checkPlacements(controls, rfNodes, rfEdges);
      expect(r1).toHaveLength(0);
    });

    it('R3: branch-tail + stays above merge bus', () => {
      const { rfNodes, rfEdges, controls } = runLayout(wf);
      const { r3 } = checkPlacements(controls, rfNodes, rfEdges);
      expect(r3).toHaveLength(0);
    });
  });

  describe('switch with 3 cases and no default', () => {
    const wf = minimal({
      steps: [
        {
          name: 'sw',
          type: 'switch',
          variable: 'x',
          cases: [
            { value: 'a', steps: [{ name: 'step-a', type: 'http' }] },
            { value: 'b', steps: [{ name: 'step-b', type: 'http' }] },
            { value: 'c', steps: [{ name: 'step-c', type: 'http' }] },
          ],
        },
      ] as unknown as WorkflowYaml['steps'],
    });

    it('R1: no fork-head + overlaps a card', () => {
      const { rfNodes, rfEdges, controls } = runLayout(wf);
      const { r1 } = checkPlacements(controls, rfNodes, rfEdges);
      expect(r1).toHaveLength(0);
    });

    it('R3: branch-tail + stays above merge bus', () => {
      const { rfNodes, rfEdges, controls } = runLayout(wf);
      const { r3 } = checkPlacements(controls, rfNodes, rfEdges);
      expect(r3).toHaveLength(0);
    });
  });

  describe('nested foreach → if → parallel (new-workflow-4 core)', () => {
    const wf = minimal({
      steps: [
        {
          name: 'foreach-step',
          type: 'foreach',
          value: '{{ items }}',
          steps: [
            { name: 'data-concat-step', type: 'http' },
            {
              name: 'if-step',
              type: 'if',
              condition: 'true',
              steps: [
                {
                  name: 'parallel-step',
                  type: 'parallel',
                  branches: [
                    {
                      name: 'aaaa',
                      steps: [{ name: 'data-regexextract-step', type: 'http' }],
                    },
                    {
                      name: 'bbbb',
                      steps: [{ name: 'data-filter-step', type: 'http' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'switch-step',
          type: 'switch',
          variable: 'x',
          cases: [
            { value: 'a', steps: [{ name: 'data-aggregate-step', type: 'http' }] },
            { value: 'b', steps: [{ name: 'data-concat-step-2', type: 'http' }] },
            { value: 'c', steps: [{ name: 'data-dedupe-step', type: 'http' }] },
            { value: 'd', steps: [{ name: 'data-find-step', type: 'http' }] },
          ],
        },
      ] as unknown as WorkflowYaml['steps'],
    });

    it('R1: no fork-head + overlaps a card', () => {
      const { rfNodes, rfEdges, controls } = runLayout(wf);
      const { r1 } = checkPlacements(controls, rfNodes, rfEdges);
      expect(r1).toHaveLength(0);
    });

    it('R3: branch-tail + stays above merge bus', () => {
      const { rfNodes, rfEdges, controls } = runLayout(wf);
      const { r3 } = checkPlacements(controls, rfNodes, rfEdges);
      expect(r3).toHaveLength(0);
    });
  });
});
