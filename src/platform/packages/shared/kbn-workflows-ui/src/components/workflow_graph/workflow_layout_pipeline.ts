/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DagPositionedEdge, DagPositionedNode } from '@kbn/dag-layout';
import { dagLayout } from '@kbn/dag-layout';
import type { LayoutDirection, TransformResult } from '@kbn/workflows';
import { FORK_HEAD_MIN_GAP } from './compute_wire_insertion_controls';
import { packCrossAxis } from './pack_workflow_structure';

// Workflow-specific layout constants. These encode domain knowledge (foreach
// header height, gutter widths) that does not belong in @kbn/dag-layout.
// Exported so tests can import the real values instead of re-declaring them.
// bottom = TERMINAL_STUB_PX (75) + PORT_DOT_SIZE/2 (4) + margin (17) = 96.
// This keeps the terminal stub of the last inner step visible inside the container.
export const WORKFLOW_COMPOUND_PADDING = { top: 70, right: 32, bottom: 96, left: 32 } as const;
export const WORKFLOW_NODE_SEP = 50;
export const WORKFLOW_RANK_SEP = 70;

export interface LayoutSnapshot {
  nodes: DagPositionedNode[];
  edges: DagPositionedEdge[];
}

/**
 * Pure data pipeline: TransformResult → dagLayout → packCrossAxis → positioned nodes + edges.
 *
 * Maps domain nodes/edges/groups to the @kbn/dag-layout format and runs the layout
 * engine, which decides the main axis (ranks, sizes, container heights). The cross
 * axis is then set from the workflow's block structure (see `packCrossAxis`), so forks,
 * containers and lanes are placed by rule instead of being repaired afterwards. The
 * engine's edge waypoints refer to its own cross positions, so they are dropped and
 * edges are routed by `computeEdgePath` from the final handle positions.
 * Throws on layout failure (e.g. a cyclic compound graph) — callers are responsible
 * for error handling and any perf instrumentation.
 */
export const computeWorkflowLayout = (
  transformed: TransformResult,
  { direction }: { direction: LayoutDirection }
): LayoutSnapshot => {
  const { nodes, edges, foreachGroups, bypassLaneNodes } = transformed;

  // Extra main-axis space added symmetrically to each fork node so the fork-head +
  // button fits between the chip and the branch card without overlapping. Undone
  // right after dagLayout. Zero when WORKFLOW_RANK_SEP already provides enough room.
  const forkHeadReserve = Math.max(0, FORK_HEAD_MIN_GAP - WORKFLOW_RANK_SEP);
  const forkNodeIds = new Set(transformed.forkNodeToJoinId.keys());
  const isTB = direction === 'TB';

  const inflatedSize = (n: { id: string; style: { width: number; height: number } }) => {
    const grow = forkNodeIds.has(n.id) ? forkHeadReserve * 2 : 0;
    return {
      id: n.id,
      width: isTB ? n.style.width : n.style.width + grow,
      height: isTB ? n.style.height + grow : n.style.height,
    };
  };

  const dagNodes = [
    ...nodes.map(inflatedSize),
    // Bypass lane nodes live outside domain `nodes` — add them here so dagre
    // sees them and allocates lanes for unbalanced if/switch branches.
    ...bypassLaneNodes.map((n) => ({
      id: n.id,
      width: n.style.width,
      height: n.style.height,
    })),
  ];
  const dagEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));
  const dagGroups = foreachGroups.map((g) => ({
    id: g.id,
    innerNodes: [
      ...g.innerNodes.map(inflatedSize),
      ...g.bypassLaneNodes.map((n) => ({
        id: n.id,
        width: n.style.width,
        height: n.style.height,
      })),
    ],
    innerEdges: g.innerEdges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  }));

  // Assert the seam: every lane node id exists in its host graph's node set, and
  // no node id appears in two lanes. Both catch the graph-boundary asymmetry early.
  if (process.env.NODE_ENV !== 'production') {
    const rootNodeIdSet = new Set(dagNodes.map((n) => n.id));
    const groupNodeSets = new Map(
      dagGroups.map((g) => [g.id, new Set(g.innerNodes.map((n) => n.id))])
    );
    const allClaimedIds = new Set<string>();
    for (const lane of transformed.fallbackLanes) {
      for (const nodeId of lane.nodes) {
        if (allClaimedIds.has(nodeId)) {
          throw new Error(`reservedLane invariant: node "${nodeId}" appears in two lanes`);
        }
        allClaimedIds.add(nodeId);
        const hostSet = lane.graphId ? groupNodeSets.get(lane.graphId) : rootNodeIdSet;
        if (!hostSet?.has(nodeId)) {
          throw new Error(
            `reservedLane invariant: node "${nodeId}" not in host graph "${lane.graphId ?? 'root'}"`
          );
        }
      }
    }
  }

  const laid = dagLayout(dagNodes, dagEdges, dagGroups, {
    direction,
    nodeSep: WORKFLOW_NODE_SEP,
    rankSep: WORKFLOW_RANK_SEP,
    compoundPadding: WORKFLOW_COMPOUND_PADDING,
    // Lane nodes are excluded from dagre entirely; their placement is in the
    // +cross margin via reservedLanes. The owner has exactly one spine successor,
    // so handleSingleChild fires → spine is structurally straight (ADR-0012).
    reservedLanes: transformed.fallbackLanes.map((l) => ({
      nodeIds: l.nodes,
      depth: l.depth,
      ownerId: l.owner,
    })),
  });

  // Give fork nodes back their real card size. The inflation was symmetric, so shifting
  // by the reserve and shrinking by twice that keeps the card centre fixed.
  const deflatedNodes =
    forkHeadReserve > 0
      ? laid.nodes.map((n) => {
          if (!forkNodeIds.has(n.id)) return n;
          return isTB
            ? { ...n, y: n.y + forkHeadReserve, height: n.height - forkHeadReserve * 2 }
            : { ...n, x: n.x + forkHeadReserve, width: n.width - forkHeadReserve * 2 };
        })
      : laid.nodes;

  return {
    nodes: packCrossAxis({
      structure: transformed.structure,
      nodes: deflatedNodes,
      direction,
      nodeSep: WORKFLOW_NODE_SEP,
      compoundPadding: WORKFLOW_COMPOUND_PADDING,
    }),
    edges: laid.edges.map((edge) => ({ ...edge, points: [] })),
  };
};
