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
  anchorFallbackOwnersSpeculative,
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

  const laid = dagLayout(dagNodes, dagEdges, dagGroups, {
    direction,
    nodeSep: WORKFLOW_NODE_SEP,
    rankSep: WORKFLOW_RANK_SEP,
    compoundPadding: WORKFLOW_COMPOUND_PADDING,
    // Exclude failure edges from cross-axis alignment so the owner node stays
    // in the spine column rather than drifting to the midpoint of spine + lane.
    // The edges still participate in dagre ranking and routing, and
    // separateRankOverlapsInPlace still runs on the full graph — the
    // non-overlap guarantee is preserved (ADR-0009).
    alignmentIgnoredEdges: edges.filter((e) => e.isFailure).map((e) => e.id),
  });

  // Snapshot cross-axis centres immediately after dagLayout, before any
  // post-dagre pass moves nodes. reconcileEdgePoints uses this to translate-or-
  // clear edge waypoints after all position-mutating passes (Step 4).
  const crossAxis = direction === 'TB' ? 'x' : 'y';
  const initialCentres = new Map(
    laid.nodes.map((n) => [
      n.id,
      crossAxis === 'x' ? n.x + n.width / 2 : n.y + n.height / 2,
    ])
  );

  // Post-dagre pass 1: enforce fork lane declaration order.
  // Runs once per graph (outer + each foreachGroup body) so containers move as
  // opaque units — prevents inner nodes from detaching from their container.
  const { nodes: orderedNodes, edges: orderedEdges } = enforceForkLaneOrder(
    laid.nodes,
    laid.edges,
    transformed,
    direction,
    WORKFLOW_NODE_SEP
  );

  // Post-dagre pass 2: enforce trigger lane declaration order.
  const { nodes: triggeredNodes, edges: triggeredEdges } = enforceTriggerLaneOrder(
    orderedNodes,
    orderedEdges,
    transformed.nodeRefs,
    direction
  );

  // Post-dagre pass 3: order-preserving overlap repair.
  // Packing is fork-local and can leave nested-fork nodes overlapping nodes
  // outside the fork's own lanes. PAVA is order-preserving (never swaps two
  // nodes), so it cannot undo the lane ordering from passes 1–2. On raw
  // dagLayout output this is a verified no-op (0/400 shapes in the corpus).
  const groupInnerIds = new Map<string, Set<string>>(
    transformed.foreachGroups.map((g) => [
      g.id,
      new Set([
        ...g.innerNodes.map((n) => n.id),
        ...(g.bypassLaneNodes ?? []).map((n) => n.id),
      ]),
    ])
  );

  // separatePositionedOverlapsInPlace mutates the array in place.
  const repairedNodes = [...triggeredNodes];
  separatePositionedOverlapsInPlace(repairedNodes, crossAxis, WORKFLOW_NODE_SEP, groupInnerIds);

  // Post-dagre pass 4: speculative anchoring of each fallback owner onto its
  // spine column. Runs AFTER the repair pass — running before repair causes the
  // repair to re-space ranks independently, destroying alignment (measured:
  // 2.0% vs 74.1% owner straightness). Per-owner rollback protects lane order.
  anchorFallbackOwnersSpeculative(
    repairedNodes,
    transformed.edges,
    transformed.fallbackLanes,
    crossAxis,
    WORKFLOW_NODE_SEP,
    groupInnerIds
  );

  // Post-dagre pass 5: reconcile edge waypoints.
  // Translate-or-clear based on how much each endpoint moved since dagLayout.
  // Single pass, covers all prior position mutations. Preserves reference
  // equality for React Flow's memo when points are unchanged.
  const finalEdges = reconcileEdgePoints(
    triggeredEdges,
    repairedNodes,
    initialCentres,
    crossAxis
  );

  return { nodes: repairedNodes, edges: finalEdges };
};
