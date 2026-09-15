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
import { enforceErrorBranchPlacement } from './error_branch_placement';
import { enforceForkLaneOrder } from './enforce_fork_lane_order';
import { enforceTriggerLaneOrder } from './enforce_trigger_lane_order';

// Workflow-specific layout constants. These encode domain knowledge (foreach
// header height, gutter widths) that does not belong in @kbn/dag-layout.
// Exported so tests can import the real values instead of re-declaring them.
export const WORKFLOW_COMPOUND_PADDING = { top: 70, right: 32, bottom: 32, left: 32 } as const;
export const WORKFLOW_NODE_SEP = 50;
// Must clear FORK_BUS_TRUNK (80) plus TRUNK_LENGTH_TO_TARGET (40) so fork
// edges keep a straight lead-in before the arrowhead instead of curving
// straight into the marker.
export const WORKFLOW_RANK_SEP = 130;

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
  // Dagre places earlier same-source edges toward the high end of the
  // cross-axis (right in TB, bottom in LR). Port reading order is
  // true → false → error (low → high), so feed failure, then else, then
  // then — so `then` (true) lands on the low side (left/top).
  const forkLayoutPriority = (e: {
    readonly isFailure?: boolean;
    readonly branchType?: string;
  }): number => {
    if (e.isFailure) return 0;
    if (e.branchType === 'else') return 1;
    if (e.branchType === 'then') return 2;
    return 3;
  };
  const sortForkEdgesForDagre = <
    E extends { readonly source: string; readonly isFailure?: boolean; readonly branchType?: string }
  >(
    list: readonly E[]
  ): E[] =>
    [...list].sort((a, b) => {
      if (a.source !== b.source) return 0;
      return forkLayoutPriority(a) - forkLayoutPriority(b);
    });

  const dagEdges = sortForkEdgesForDagre(edges).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));
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
    // Same fork sort as top-level — unsorted emission order (then before else)
    // puts true on the high cross-axis side inside compound groups.
    innerEdges: sortForkEdgesForDagre(g.innerEdges).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
  }));

  const laid = dagLayout(dagNodes, dagEdges, dagGroups, {
    direction,
    nodeSep: WORKFLOW_NODE_SEP,
    rankSep: WORKFLOW_RANK_SEP,
    compoundPadding: WORKFLOW_COMPOUND_PADDING,
  });

  // Dagre's order phase can still flip then/else when branch depths differ
  // (e.g. else grows to 2+ steps). Re-assert port lane order on the result.
  const domainEdges = [
    ...edges,
    ...foreachGroups.flatMap((g) => g.innerEdges),
  ];
  const ordered = enforceForkLaneOrder({
    nodes: laid.nodes,
    edges: laid.edges,
    domainEdges,
    direction,
  });
  // Triggers fan into the first step; dagre often mirrors declaration order.
  // Keep YAML order on the cross-axis so "Add trigger" (past the last trigger)
  // places the appended trigger beside the control.
  const triggerIds = nodes.filter((n) => n.type === 'trigger').map((n) => n.id);
  const triggersOrdered = enforceTriggerLaneOrder({
    nodes: ordered.nodes,
    edges: ordered.edges,
    triggerIds,
    direction,
  });
  return enforceErrorBranchPlacement({
    nodes: triggersOrdered.nodes,
    edges: triggersOrdered.edges,
    domainEdges,
    direction,
  });
};
