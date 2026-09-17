/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DagPositionedEdge, DagPositionedNode } from '@kbn/dag-layout';
import type { ForeachGroup, GraphEdge, NodeRef } from '@kbn/workflows';

/**
 * Two pure post-dagre passes that enforce lane declaration order.
 *
 * Dagre orders same-source lanes by subtree depth, which means growing the
 * `else` branch of an `if` can visually swap the `true`/`false` lanes. In an
 * authoring surface the port a user clicks must correspond to the branch that
 * grows; a layout that re-orders lanes on every edit is unusable.
 *
 * Both passes permute disjoint cross-axis lane intervals, preserving gaps.
 * This handles unequal lane widths and cannot introduce overlap, so PAVA
 * need not re-run.
 *
 * Runs once per laid-out graph (outer + each foreachGroup's inner graph) so a
 * container is always an opaque node in its parent's graph, avoiding the
 * coordinate-mismatch that would arise from moving a container without its
 * inner nodes.
 */

/** Mutable working copies of the positioned graph. */
interface MutableGraph {
  nodes: Map<string, { x: number; y: number; width: number; height: number }>;
  edges: Map<string, { source: string; target: string; points: Array<{ x: number; y: number }> }>;
}

/**
 * Build exclusive reachable sets for each lane head of a fork.
 * Returns null if the fork structure is degenerate (e.g., all heads merge
 * immediately or the head set is empty after filtering).
 *
 * "Exclusive" = reachable from this head AND NOT reachable from any sibling
 * head. Shared join nodes (in-degree > 1 over all domain edges) belong to
 * no lane.
 */
const buildLaneSets = (
  forkHeads: readonly string[],
  graphEdges: readonly GraphEdge[]
): Map<string, Set<string>> | null => {
  if (forkHeads.length < 2) return null;

  // Build a fast successor index
  const successors = new Map<string, string[]>();
  for (const e of graphEdges) {
    if (!successors.has(e.source)) successors.set(e.source, []);
    successors.get(e.source)!.push(e.target);
  }

  // BFS reachability from each head
  const reachable = (start: string): Set<string> => {
    const visited = new Set<string>();
    const queue: string[] = [start];
    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node)) continue;
      visited.add(node);
      for (const next of successors.get(node) ?? []) {
        if (!visited.has(next)) queue.push(next);
      }
    }
    return visited;
  };

  const perHeadReachable = new Map(forkHeads.map((h) => [h, reachable(h)]));

  // Exclusive set per head = reachable from head MINUS reachable from any sibling
  const result = new Map<string, Set<string>>();
  for (const head of forkHeads) {
    const mine = perHeadReachable.get(head)!;
    const exclusive = new Set<string>();
    for (const node of mine) {
      let sharedWithSibling = false;
      for (const [otherHead, otherReachable] of perHeadReachable) {
        if (otherHead !== head && otherReachable.has(node)) {
          sharedWithSibling = true;
          break;
        }
      }
      if (!sharedWithSibling) exclusive.add(node);
    }
    result.set(head, exclusive);
  }
  return result;
};

/**
 * Translate `points` by (dx, dy) — reimplemented locally because
 * `translateEdgePoints` is not exported from `@kbn/dag-layout`'s barrel.
 */
const translatePoints = (
  points: ReadonlyArray<{ readonly x: number; readonly y: number }>,
  dx: number,
  dy: number
): Array<{ x: number; y: number }> => points.map(({ x, y }) => ({ x: x + dx, y: y + dy }));

/**
 * Run one fork-order enforcement pass over a single graph.
 *
 * @param graphEdges - Domain edges for this graph in **declaration order**.
 * @param graph - Mutable working copy of nodes and edges for this graph.
 * @param crossAxis - Which coordinate axis encodes lane position ('x' for TB, 'y' for LR).
 * @param innerNodeIds - Set of node ids that belong to this graph's containers.
 *   When a container node moves, all its inner nodes move by the same delta.
 *   Pass an empty map for inner graphs (they have no nested containers visible
 *   at this level of the flat node list).
 */
const enforceForkLaneOrderForGraph = (
  graphEdges: readonly GraphEdge[],
  graph: MutableGraph,
  crossAxis: 'x' | 'y',
  containerInnerIds: ReadonlyMap<string, ReadonlySet<string>>
): void => {
  // Group edges by source, preserving declaration order.
  const edgesBySource = new Map<string, string[]>(); // source → targets in order
  for (const e of graphEdges) {
    if (!graph.nodes.has(e.source)) continue;
    if (!edgesBySource.has(e.source)) edgesBySource.set(e.source, []);
    edgesBySource.get(e.source)!.push(e.target);
  }

  // Process each fork (source with > 1 outgoing edge)
  for (const [, heads] of edgesBySource) {
    if (heads.length < 2) continue;

    const laneSets = buildLaneSets(heads, graphEdges);
    if (!laneSets) continue;

    // Compute the cross-axis interval [min, max] of each lane from node positions.
    // The interval covers all exclusive nodes INCLUDING inner nodes of any
    // container in the lane (they were translated together at layout time).
    const laneIntervals = new Map<string, { min: number; max: number }>();
    for (const [head, laneNodes] of laneSets) {
      let min = Infinity;
      let max = -Infinity;
      for (const nodeId of laneNodes) {
        const n = graph.nodes.get(nodeId);
        if (!n) continue;
        const start = n[crossAxis];
        const end = start + (crossAxis === 'x' ? n.width : n.height);
        if (start < min) min = start;
        if (end > max) max = end;
        // Also include inner nodes of any container in this lane
        for (const innerId of containerInnerIds.get(nodeId) ?? []) {
          const inner = graph.nodes.get(innerId);
          if (!inner) continue;
          const iStart = inner[crossAxis];
          const iEnd = iStart + (crossAxis === 'x' ? inner.width : inner.height);
          if (iStart < min) min = iStart;
          if (iEnd > max) max = iEnd;
        }
      }
      if (isFinite(min) && isFinite(max)) {
        laneIntervals.set(head, { min, max });
      }
    }

    // Current order = heads sorted by min cross-axis position
    const currentOrder = [...heads].filter((h) => laneIntervals.has(h));
    if (currentOrder.length < 2) continue;
    const sorted = [...currentOrder].sort(
      (a, b) => laneIntervals.get(a)!.min - laneIntervals.get(b)!.min
    );

    // If already in declaration order, nothing to do.
    if (sorted.every((h, i) => h === currentOrder[i])) continue;

    // Assign sorted starting positions to declaration-ordered heads.
    // declaration_order[i] gets sorted_pos[i]. This preserves the overall span
    // and guarantees no overlap for equal-width lanes. Each interval keeps its
    // SIZE; only the starting position is permuted.
    const sortedStarts = sorted.map((h) => laneIntervals.get(h)!.min);
    const newMins = new Map<string, number>();
    currentOrder.forEach((head, i) => {
      newMins.set(head, sortedStarts[i]);
    });

    // Apply translations.
    for (const [head, laneNodes] of laneSets) {
      const oldMin = laneIntervals.get(head)?.min;
      const newMin = newMins.get(head);
      if (oldMin === undefined || newMin === undefined) continue;
      const delta = newMin - oldMin;
      if (Math.abs(delta) < 0.001) continue;

      const dx = crossAxis === 'x' ? delta : 0;
      const dy = crossAxis === 'y' ? delta : 0;

      // Translate all exclusive nodes in this lane.
      for (const nodeId of laneNodes) {
        const n = graph.nodes.get(nodeId);
        if (n) {
          graph.nodes.set(nodeId, { ...n, x: n.x + dx, y: n.y + dy });
        }
        // Also translate inner nodes of any container in this lane.
        for (const innerId of containerInnerIds.get(nodeId) ?? []) {
          const inner = graph.nodes.get(innerId);
          if (inner) {
            graph.nodes.set(innerId, { ...inner, x: inner.x + dx, y: inner.y + dy });
          }
        }
      }

      // Translate edge points.
      for (const [edgeId, edge] of graph.edges) {
        const sourceInLane = laneNodes.has(edge.source);
        const targetInLane = laneNodes.has(edge.target);
        if (sourceInLane && targetInLane) {
          if (edge.points.length > 0) {
            graph.edges.set(edgeId, {
              ...edge,
              points: translatePoints(edge.points, dx, dy),
            });
          }
        } else if (sourceInLane !== targetInLane) {
          // Edge crosses a lane boundary — clear waypoints; straight line is safe.
          if (edge.points.length > 0) {
            graph.edges.set(edgeId, { ...edge, points: [] });
          }
        }
        // Edges entirely outside this lane: leave untouched (return original reference).
      }
    }
  }
};

/**
 * Enforce fork lane declaration order across the outer graph and each
 * foreachGroup's inner graph.
 */
export const enforceForkLaneOrder = (
  nodes: readonly DagPositionedNode[],
  edges: readonly DagPositionedEdge[],
  transformed: {
    edges: readonly GraphEdge[];
    foreachGroups: readonly ForeachGroup[];
  },
  direction: 'TB' | 'LR'
): { nodes: DagPositionedNode[]; edges: DagPositionedEdge[] } => {
  const crossAxis: 'x' | 'y' = direction === 'TB' ? 'x' : 'y';

  // Build mutable working copies
  const mutableNodes = new Map(
    nodes.map((n) => [n.id, { x: n.x, y: n.y, width: n.width, height: n.height }])
  );
  const mutableEdges = new Map(
    edges.map((e) => [
      e.id,
      { source: e.source, target: e.target, points: [...e.points.map(({ x, y }) => ({ x, y }))] },
    ])
  );

  // Build container → inner node ids mapping (for outer pass only).
  // A container that moves carries ALL its inner nodes (including nested).
  const containerInnerIds = new Map<string, Set<string>>();
  for (const group of transformed.foreachGroups) {
    const ids = new Set([
      ...group.innerNodes.map((n) => n.id),
      ...(group.bypassLaneNodes ?? []).map((n) => n.id),
    ]);
    containerInnerIds.set(group.id, ids);
  }

  // Outer pass: uses transformed.edges, containers are opaque.
  const outerGraph: MutableGraph = { nodes: mutableNodes, edges: mutableEdges };
  enforceForkLaneOrderForGraph(transformed.edges, outerGraph, crossAxis, containerInnerIds);

  // Inner pass per foreachGroup: each group's body is an independent graph.
  // After the outer pass has moved the containers, inner node absolute positions
  // are already updated (they were moved with their container). The inner pass
  // reorders forks INSIDE each body independently.
  for (const group of transformed.foreachGroups) {
    if (group.innerEdges.length === 0) continue;

    // Find positioned inner edges (they're in the global edge map by id).
    // No nested container closure needed — inner graph treats sub-containers as opaque.
    enforceForkLaneOrderForGraph(
      group.innerEdges,
      { nodes: mutableNodes, edges: mutableEdges },
      crossAxis,
      new Map() // inner graphs have no container inner-ids to carry
    );
  }

  // Reconstruct readonly output arrays.
  // IMPORTANT: preserve original array order — parent-before-child for React Flow's
  // parentId, and paint-order for edges.
  const resultNodes = nodes.map((original) => {
    const updated = mutableNodes.get(original.id);
    if (!updated) return original;
    if (updated.x === original.x && updated.y === original.y) return original;
    return { ...original, x: updated.x, y: updated.y } as DagPositionedNode;
  });

  const resultEdges = edges.map((original) => {
    const updated = mutableEdges.get(original.id);
    if (!updated) return original;
    if (updated.points.length === 0 && original.points.length === 0) return original;
    // Check if points actually changed before creating new object (reference equality
    // for memo in workflow_graph_edge.tsx).
    if (
      updated.points.length === original.points.length &&
      updated.points.every((p, i) => p.x === original.points[i].x && p.y === original.points[i].y)
    ) {
      return original;
    }
    return { ...original, points: updated.points } as DagPositionedEdge;
  });

  return { nodes: resultNodes, edges: resultEdges };
};

/**
 * Enforce trigger lane declaration order.
 *
 * Triggers share rank 0 and all fan into the first step. Each trigger is a
 * single-node lane. Expected order comes from `nodeRefs[id].triggerIndex`.
 */
export const enforceTriggerLaneOrder = (
  nodes: readonly DagPositionedNode[],
  edges: readonly DagPositionedEdge[],
  nodeRefs: Readonly<Record<string, NodeRef>>,
  direction: 'TB' | 'LR'
): { nodes: DagPositionedNode[]; edges: DagPositionedEdge[] } => {
  const crossAxis: 'x' | 'y' = direction === 'TB' ? 'x' : 'y';

  const triggerNodes = nodes.filter((n) => nodeRefs[n.id]?.kind === 'trigger');
  if (triggerNodes.length < 2) return { nodes: [...nodes], edges: [...edges] };

  // Current order: sorted by cross-axis position
  const sorted = [...triggerNodes].sort((a, b) => a[crossAxis] - b[crossAxis]);

  // Expected order: sorted by triggerIndex
  const byIndex = [...triggerNodes].sort((a, b) => {
    const refA = nodeRefs[a.id];
    const refB = nodeRefs[b.id];
    const indexA = refA?.kind === 'trigger' ? refA.triggerIndex : 0;
    const indexB = refB?.kind === 'trigger' ? refB.triggerIndex : 0;
    return indexA - indexB;
  });

  // If already in declaration order, nothing to do.
  if (sorted.every((n, i) => n.id === byIndex[i].id)) {
    return { nodes: [...nodes], edges: [...edges] };
  }

  // Compute trigger cross-axis positions as a permutation of the sorted positions.
  // Gaps between sorted positions are preserved.
  const sortedPositions = sorted.map((n) => n[crossAxis]);

  const newPositions = new Map<string, number>();
  byIndex.forEach((node, i) => {
    newPositions.set(node.id, sortedPositions[i]);
  });

  const resultNodes = nodes.map((n) => {
    const newPos = newPositions.get(n.id);
    if (newPos === undefined) return n;
    if (newPos === n[crossAxis]) return n;
    return crossAxis === 'x'
      ? ({ ...n, x: newPos } as DagPositionedNode)
      : ({ ...n, y: newPos } as DagPositionedNode);
  });

  // Trigger edges all point to the first step (in-degree > 1), so they already
  // have points: [] from dagre. No edge translation needed.

  return { nodes: resultNodes, edges: [...edges] };
};
