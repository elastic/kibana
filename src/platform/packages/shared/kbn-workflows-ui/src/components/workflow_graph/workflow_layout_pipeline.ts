/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DagPositionedEdge, DagPositionedNode } from '@kbn/dag-layout';
import { dagLayout, separatePositionedOverlapsInPlace } from '@kbn/dag-layout';
import type { LayoutDirection, TransformResult } from '@kbn/workflows';
import {
  buildContainerDescendants,
  buildContainerMembers,
  enforceForkBranchCompoundOrder,
  enforceForkLaneOrder,
  enforceTriggerLaneOrder,
  reconcileEdgePoints,
} from './enforce_lane_order';

// Workflow-specific layout constants. These encode domain knowledge (foreach
// header height, gutter widths) that does not belong in @kbn/dag-layout.
// Exported so tests can import the real values instead of re-declaring them.
export const WORKFLOW_COMPOUND_PADDING = { top: 70, right: 32, bottom: 32, left: 32 } as const;
export const WORKFLOW_NODE_SEP = 50;
export const WORKFLOW_RANK_SEP = 70;

export interface LayoutSnapshot {
  nodes: DagPositionedNode[];
  edges: DagPositionedEdge[];
}

/**
 * Pure data pipeline: TransformResult → dagLayout → positioned nodes + edges.
 *
 * Maps domain nodes/edges/groups to the @kbn/dag-layout format, runs the
 * layout engine, and derives `triggerNodeIds` / `leafNodeIds` from the domain
 * nodes. Throws on layout failure (e.g. a cyclic compound graph) — callers
 * are responsible for error handling and any perf instrumentation.
 */
export const computeWorkflowLayout = (
  transformed: TransformResult,
  { direction }: { direction: LayoutDirection }
): LayoutSnapshot => {
  const { nodes, edges, foreachGroups, bypassLaneNodes } = transformed;

  const dagNodes = [
    ...nodes.map((n) => ({
      id: n.id,
      width: n.style.width,
      height: n.style.height,
    })),
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
      ...g.innerNodes.map((n) => ({
        id: n.id,
        width: n.style.width,
        height: n.style.height,
      })),
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

  // Snapshot cross-axis centres immediately after dagLayout, before any
  // post-dagre pass moves nodes. reconcileEdgePoints uses this to translate-or-
  // clear edge waypoints after all position-mutating passes (Step 4).
  const crossAxis = direction === 'TB' ? 'x' : 'y';
  const initialCentres = new Map(
    laid.nodes.map((n) => [n.id, crossAxis === 'x' ? n.x + n.width / 2 : n.y + n.height / 2])
  );

  // Build two closure sets for post-dagre passes (see CONTEXT.md,
  // "container members vs container descendants"):
  //   - containerMembers: direct members only (for PAVA inner sweeps — nested
  //     container bodies must not be separated as peers).
  //   - containerDescendants: transitive closure (for outer-node exclusion,
  //     carry-on-move, and any pass that moves a container as an opaque unit).
  const containerMembers = buildContainerMembers(transformed.foreachGroups);
  const containerDescendants = buildContainerDescendants(transformed.foreachGroups);

  // Post-dagre pass 1: enforce fork lane declaration order.
  // Runs once per graph (outer + each foreachGroup body) so containers move as
  // opaque units — prevents inner nodes from detaching from their container.
  const { nodes: orderedNodes, edges: orderedEdges } = enforceForkLaneOrder(
    laid.nodes,
    laid.edges,
    transformed,
    direction,
    WORKFLOW_NODE_SEP,
    containerDescendants
  );

  // Post-dagre pass 1b: pack fork branches as per-step micro-compounds.
  // Each step's fallback hierarchy is placed contiguously next to that step,
  // before the next branch starts — "invisible compound container" model.
  // Runs after pass 1 (which enforces declaration order using spine-only widths)
  // so this pass can assume branches are already in the correct cross-axis order.
  const { nodes: compactedNodes, edges: compactedEdges } = enforceForkBranchCompoundOrder(
    orderedNodes,
    orderedEdges,
    transformed,
    direction,
    WORKFLOW_NODE_SEP,
    containerDescendants
  );

  // Post-dagre pass 2: enforce trigger lane declaration order.
  const { nodes: triggeredNodes, edges: triggeredEdges } = enforceTriggerLaneOrder(
    compactedNodes,
    compactedEdges,
    transformed.nodeRefs,
    direction
  );

  // Post-dagre pass 3: order-preserving overlap repair.
  // Packing is fork-local and can leave nested-fork nodes overlapping nodes
  // outside the fork's own lanes. PAVA is order-preserving (never swaps two
  // nodes), so it cannot undo the lane ordering from passes 1–2. Lane nodes
  // are tagged `crossPinned: true` by dagLayout — PAVA treats them as immovable
  // anchors so packing cannot narrow the reserved margin. On raw dagLayout
  // output this is expected to be a no-op (verify with the seeded corpus).

  // separatePositionedOverlapsInPlace mutates the array in place.
  // Pass direct members as groupMemberIds (for inner PAVA sweeps) and the
  // transitive closure as groupDescendantIds (for outer-node exclusion and
  // carry-on-move) — these two roles require different granularities.
  const repairedNodes = [...triggeredNodes];
  separatePositionedOverlapsInPlace(
    repairedNodes,
    crossAxis,
    WORKFLOW_NODE_SEP,
    containerMembers,
    containerDescendants
  );

  // Post-dagre pass 4: reconcile edge waypoints.
  // Translate-or-clear based on how much each endpoint moved since dagLayout.
  // NOTE: dagLayout now moves spine nodes on the main axis (spine push for
  // reserved lanes — see ADR-0012). That push happens INSIDE dagLayout, before
  // the snapshot, so the snapshot already captures post-push positions and this
  // pass compares cross-axis deltas only, as before.
  const finalEdges = reconcileEdgePoints(triggeredEdges, repairedNodes, initialCentres, crossAxis);

  return { nodes: repairedNodes, edges: finalEdges };
};
