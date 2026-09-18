/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DagPositionedEdge, DagPositionedNode } from '@kbn/dag-layout';
import { separatePositionedOverlapsInPlace } from '@kbn/dag-layout';
import type { FallbackLane, ForeachGroup, GraphEdge, NodeRef } from '@kbn/workflows';

/**
 * Two pure post-dagre passes that enforce lane declaration order.
 *
 * Dagre orders same-source lanes by subtree depth, which means growing the
 * `else` branch of an `if` can visually swap the `true`/`false` lanes. In an
 * authoring surface the port a user clicks must correspond to the branch that
 * grows; a layout that re-orders lanes on every edit is unusable.
 *
 * The fork pass uses rank-aware profile packing: for each fork, the first
 * declared lane is anchored at the union's leftmost current position, and
 * subsequent lanes are packed right using a scanline no-fit constraint. This
 * handles unequal-width lanes and containers correctly. A repair pass
 * (`separatePositionedOverlapsInPlace`) runs after to close any remaining
 * overlaps from nested forks. Edge-point reconciliation (`reconcileEdgePoints`)
 * runs once at the end of the pipeline.
 *
 * Runs once per laid-out graph (outer + each foreachGroup's inner graph) so a
 * container is always an opaque node in its parent's graph.
 */

/** Mutable working copy of positioned nodes (edges reconciled separately). */
type MutableNodes = Map<string, { x: number; y: number; width: number; height: number }>;

/**
 * Build exclusive reachable sets for each lane head of a fork.
 * Returns null if the fork structure is degenerate (e.g., all heads merge
 * immediately or the head set is empty after filtering).
 *
 * "Exclusive" = reachable from this head AND NOT reachable from any sibling
 * head. Shared join nodes belong to no lane.
 *
 * For fallback forks only: pass the `failureHead` of the owner. Any node
 * shared between the fallback lane and the spine lane is assigned to the
 * **spine** lane (asymmetric exclusion). A `continue` rejoin means the lane
 * feeds the spine rather than branching beside it (root cause 3). Gate it on
 * `failureHead !== undefined` so if/switch/parallel are unaffected.
 */
const buildLaneSets = (
  forkHeads: readonly string[],
  graphEdges: readonly GraphEdge[],
  failureHead?: string
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

  if (failureHead !== undefined) {
    // Asymmetric exclusion for fallback forks.
    // Spine lane = reach(spine). Failure lane = reach(failure) \ reach(spine).
    const spineReach = new Set<string>();
    for (const [h, reach] of perHeadReachable) {
      if (h !== failureHead) {
        for (const n of reach) spineReach.add(n);
      }
    }
    const result = new Map<string, Set<string>>();
    for (const head of forkHeads) {
      if (head === failureHead) {
        const failureReach = perHeadReachable.get(head)!;
        const exclusive = new Set<string>();
        for (const n of failureReach) {
          if (!spineReach.has(n)) exclusive.add(n);
        }
        result.set(head, exclusive);
      } else {
        // Spine: claim its full reachable set (including shared nodes).
        result.set(head, new Set(perHeadReachable.get(head)!));
      }
    }
    return result;
  }

  // Symmetric exclusion for if/switch/parallel forks.
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

/** Smallest cross-axis coordinate occupied by a lane's nodes (including container inner nodes). */
const laneCrossMin = (
  laneNodes: Set<string>,
  mutableNodes: MutableNodes,
  containerInnerIds: ReadonlyMap<string, ReadonlySet<string>>,
  crossAxis: 'x' | 'y'
): number => {
  let min = Infinity;
  for (const nodeId of laneNodes) {
    const n = mutableNodes.get(nodeId);
    if (n) {
      if (n[crossAxis] < min) min = n[crossAxis];
      for (const innerId of containerInnerIds.get(nodeId) ?? []) {
        const inner = mutableNodes.get(innerId);
        if (inner && inner[crossAxis] < min) min = inner[crossAxis];
      }
    }
  }
  return min;
};

/**
 * Compute the no-fit translation offset for `laneNodes` given already-placed
 * lanes (reflected in the current `mutableNodes`).
 *
 * For each pair (box a from any placed lane, box b from this lane) that share
 * main-axis extent, the constraint is:
 *   a.cross + a.crossSpan + nodeSep ≤ b.cross
 * The required delta is max over those pairs of (a.crossEnd + nodeSep − b.cross),
 * clamped to 0 (no leftward nudge — the anchor step handles initial placement).
 */
const computePackOffset = (
  placedLaneSets: readonly Set<string>[],
  laneNodes: Set<string>,
  mutableNodes: MutableNodes,
  containerInnerIds: ReadonlyMap<string, ReadonlySet<string>>,
  crossAxis: 'x' | 'y',
  nodeSep: number
): number => {
  let offset = 0;

  /** Yield (cross, crossEnd, main, mainEnd) for a node and its inner children. */
  const boxes = (
    nodeId: string
  ): Array<{ cross: number; crossEnd: number; main: number; mainEnd: number }> => {
    const result: Array<{ cross: number; crossEnd: number; main: number; mainEnd: number }> = [];
    const addNode = (n: { x: number; y: number; width: number; height: number }) => {
      const cross = n[crossAxis];
      const crossSpan = crossAxis === 'x' ? n.width : n.height;
      const main = crossAxis === 'x' ? n.y : n.x;
      const mainSpan = crossAxis === 'x' ? n.height : n.width;
      result.push({ cross, crossEnd: cross + crossSpan, main, mainEnd: main + mainSpan });
    };
    const n = mutableNodes.get(nodeId);
    if (n) {
      addNode(n);
      for (const innerId of containerInnerIds.get(nodeId) ?? []) {
        const inner = mutableNodes.get(innerId);
        if (inner) addNode(inner);
      }
    }
    return result;
  };

  for (const placedSet of placedLaneSets) {
    for (const placedId of placedSet) {
      const aBoxes = boxes(placedId);
      for (const bId of laneNodes) {
        const bBoxes = boxes(bId);
        for (const a of aBoxes) {
          for (const b of bBoxes) {
            // Only constrain pairs that share main-axis extent.
            if (a.mainEnd <= b.main || b.mainEnd <= a.main) continue;
            const needed = a.crossEnd + nodeSep - b.cross;
            if (needed > offset) offset = needed;
          }
        }
      }
    }
  }
  return offset;
};

/** Apply a cross-axis delta to all nodes in a lane (including container inner nodes). */
const applyLaneDelta = (
  laneNodes: Set<string>,
  mutableNodes: MutableNodes,
  containerInnerIds: ReadonlyMap<string, ReadonlySet<string>>,
  dx: number,
  dy: number
): void => {
  for (const nodeId of laneNodes) {
    const n = mutableNodes.get(nodeId);
    if (n) mutableNodes.set(nodeId, { ...n, x: n.x + dx, y: n.y + dy });
    for (const innerId of containerInnerIds.get(nodeId) ?? []) {
      const inner = mutableNodes.get(innerId);
      if (inner) mutableNodes.set(innerId, { ...inner, x: inner.x + dx, y: inner.y + dy });
    }
  }
};

/**
 * Run one fork-order enforcement pass over a single graph.
 *
 * Algorithm (rank-aware profile packing):
 * 1. For each fork (source with > 1 out-edge), build exclusive lane sets.
 * 2. Compute `unionLeft` = the smallest cross-axis coordinate across all lanes.
 * 3. Place the first declared lane at `unionLeft` (may shift it left or right).
 * 4. Pack each subsequent lane immediately to the right of all placed lanes
 *    using a scanline no-fit constraint (ignores pairs at different main-axis
 *    ranks), updating `mutableNodes` after each lane so the next sees the
 *    correct updated positions.
 *
 * @param graphEdges - Domain edges for this graph in **declaration order**.
 * @param mutableNodes - Mutable working copy of node positions.
 * @param crossAxis - Cross axis ('x' for TB, 'y' for LR).
 * @param containerInnerIds - Map from container id to its inner node ids.
 * @param nodeSep - Minimum gap between adjacent lane boxes (must match WORKFLOW_NODE_SEP).
 */
const enforceForkLaneOrderForGraph = (
  graphEdges: readonly GraphEdge[],
  mutableNodes: MutableNodes,
  crossAxis: 'x' | 'y',
  containerInnerIds: ReadonlyMap<string, ReadonlySet<string>>,
  nodeSep: number
): void => {
  // Group out-edges by source, preserving declaration order.
  // Track which targets are failure heads for asymmetric exclusion.
  const outEdges = new Map<string, string[]>(); // source → targets in order
  const failureTargets = new Set<string>();
  for (const e of graphEdges) {
    if (!mutableNodes.has(e.source)) continue;
    if (!outEdges.has(e.source)) outEdges.set(e.source, []);
    outEdges.get(e.source)!.push(e.target);
    if (e.isFailure) failureTargets.add(e.target);
  }

  // Process each fork in declaration order.
  for (const [, heads] of outEdges) {
    if (heads.length < 2) continue;

    const failureHead = heads.find((h) => failureTargets.has(h));
    const laneSets = buildLaneSets(heads, graphEdges, failureHead);
    if (!laneSets) continue;

    // Filter to heads with measurable lanes (non-empty exclusive set).
    const orderedHeads = heads.filter((h) => {
      const s = laneSets.get(h);
      return s && s.size > 0;
    });
    if (orderedHeads.length < 2) continue;

    // Compute the current leftmost cross position across all lanes.
    const unionLeft = Math.min(
      ...orderedHeads.map((h) =>
        laneCrossMin(laneSets.get(h)!, mutableNodes, containerInnerIds, crossAxis)
      )
    );
    if (!isFinite(unionLeft)) continue;

    // Pack lanes in declaration order, updating mutableNodes as we go so each
    // subsequent lane sees the already-placed lanes' updated positions.
    const placedSets: Array<Set<string>> = [];

    for (let i = 0; i < orderedHeads.length; i++) {
      const head = orderedHeads[i];
      const laneNodes = laneSets.get(head)!;

      let delta: number;
      if (i === 0) {
        // Anchor: first declared lane → unionLeft (may shift left or right).
        const currentMin = laneCrossMin(laneNodes, mutableNodes, containerInnerIds, crossAxis);
        delta = isFinite(currentMin) ? unionLeft - currentMin : 0;
      } else {
        // Pack right: no-fit constraint against all already-placed lanes.
        // placedSets reflects translations already applied to mutableNodes.
        delta = computePackOffset(placedSets, laneNodes, mutableNodes, containerInnerIds, crossAxis, nodeSep);
      }

      if (Math.abs(delta) >= 0.001) {
        const dx = crossAxis === 'x' ? delta : 0;
        const dy = crossAxis === 'y' ? delta : 0;
        applyLaneDelta(laneNodes, mutableNodes, containerInnerIds, dx, dy);
      }

      placedSets.push(laneNodes);
    }
  }
};

/**
 * Enforce fork lane declaration order across the outer graph and each
 * foreachGroup's inner graph.
 *
 * Returns updated node positions. Edge-point reconciliation is handled by
 * `reconcileEdgePoints` after all position-mutating passes.
 */
export const enforceForkLaneOrder = (
  nodes: readonly DagPositionedNode[],
  edges: readonly DagPositionedEdge[],
  transformed: {
    edges: readonly GraphEdge[];
    foreachGroups: readonly ForeachGroup[];
  },
  direction: 'TB' | 'LR',
  nodeSep: number
): { nodes: DagPositionedNode[]; edges: DagPositionedEdge[] } => {
  const crossAxis: 'x' | 'y' = direction === 'TB' ? 'x' : 'y';

  // Build mutable working copy of node positions.
  const mutableNodes: MutableNodes = new Map(
    nodes.map((n) => [n.id, { x: n.x, y: n.y, width: n.width, height: n.height }])
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
  enforceForkLaneOrderForGraph(transformed.edges, mutableNodes, crossAxis, containerInnerIds, nodeSep);

  // Inner pass per foreachGroup: each group's body is an independent graph.
  // After the outer pass has moved the containers, inner node absolute positions
  // are already updated (they were moved with their container). The inner pass
  // reorders forks INSIDE each body independently.
  for (const group of transformed.foreachGroups) {
    if (group.innerEdges.length === 0) continue;

    // No nested container closure needed — inner graph treats sub-containers as opaque.
    enforceForkLaneOrderForGraph(
      group.innerEdges,
      mutableNodes,
      crossAxis,
      new Map(), // inner graphs have no container inner-ids to carry
      nodeSep
    );
  }

  // Reconstruct readonly output arrays preserving original array order —
  // parent-before-child for React Flow's parentId, and paint-order for edges.
  const resultNodes = nodes.map((original) => {
    const updated = mutableNodes.get(original.id);
    if (!updated) return original;
    if (updated.x === original.x && updated.y === original.y) return original;
    return { ...original, x: updated.x, y: updated.y } as DagPositionedNode;
  });

  // Edge points are reconciled by reconcileEdgePoints after all passes.
  return { nodes: resultNodes, edges: [...edges] };
};

/**
 * Enforce trigger lane declaration order.
 *
 * Triggers share rank 0 and all fan into the first step. Each trigger is a
 * single-node lane using DEFAULT_NODE_STYLE (equal width), so the simple
 * position permutation is sound — no rank-aware packing needed here.
 * Expected order comes from `nodeRefs[id].triggerIndex`.
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
  // Gaps between sorted positions are preserved. Equal-width single-node lanes
  // guarantee this permutation is overlap-safe.
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

// ── Lane order check helper ──────────────────────────────────────────────────

/**
 * Returns true if any fork's heads are not in edge-list declaration order
 * from left to right on the cross axis.
 *
 * Used as the accept/reject predicate for speculative anchoring.
 */
const hasLaneOrderViolation = (
  nodeById: ReadonlyMap<string, DagPositionedNode>,
  graphEdges: readonly GraphEdge[],
  crossAxis: 'x' | 'y'
): boolean => {
  const outEdges = new Map<string, string[]>();
  for (const e of graphEdges) {
    if (!nodeById.has(e.source)) continue;
    if (!outEdges.has(e.source)) outEdges.set(e.source, []);
    outEdges.get(e.source)!.push(e.target);
  }
  for (const [, heads] of outEdges) {
    if (heads.length < 2) continue;
    let prevCross = -Infinity;
    for (const h of heads) {
      const n = nodeById.get(h);
      if (!n) continue;
      const cross = n[crossAxis];
      if (cross < prevCross - 0.001) return true; // out of order
      prevCross = cross;
    }
  }
  return false;
};

// ── Speculative anchoring (Step 3) ──────────────────────────────────────────

/**
 * For each fallback lane, try to translate the owner node onto the spine
 * column (centre-aligned with its non-failure successor). Propagates the
 * translation up any "straight run" of predecessor nodes that each have exactly
 * one total successor so they visually belong to the same column.
 *
 * Speculative per-owner rollback: a snapshot is taken before each anchor
 * attempt. After anchoring and re-running the overlap repair pass, the result
 * is accepted only if lane order is still valid — otherwise the snapshot is
 * restored. 10 rollbacks were observed across 587 owners in the 400-workflow
 * corpus; the others accepted cleanly.
 *
 * Must run AFTER the repair pass — if anchoring runs before repair, the repair
 * re-spaces ranks independently and destroys the alignment.
 */
export const anchorFallbackOwnersSpeculative = (
  nodes: DagPositionedNode[],
  graphEdges: readonly GraphEdge[],
  fallbackLanes: readonly FallbackLane[],
  crossAxis: 'x' | 'y',
  nodeSep: number,
  groupInnerIds: ReadonlyMap<string, ReadonlySet<string>>
): void => {
  if (fallbackLanes.length === 0) return;

  // Pre-build adjacency maps from the graph edges.
  const nonFailureSuccessors = new Map<string, string[]>();
  const allSuccessors = new Map<string, string[]>();
  const allPredecessors = new Map<string, string[]>();
  for (const e of graphEdges) {
    if (!allSuccessors.has(e.source)) allSuccessors.set(e.source, []);
    allSuccessors.get(e.source)!.push(e.target);
    if (!allPredecessors.has(e.target)) allPredecessors.set(e.target, []);
    allPredecessors.get(e.target)!.push(e.source);
    if (!e.isFailure) {
      if (!nonFailureSuccessors.has(e.source)) nonFailureSuccessors.set(e.source, []);
      nonFailureSuccessors.get(e.source)!.push(e.target);
    }
  }

  // Fast id → index map (updated after each mutation).
  const nodeIdx = new Map(nodes.map((n, i) => [n.id, i]));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const refreshMaps = () => {
    for (let i = 0; i < nodes.length; i++) {
      nodeIdx.set(nodes[i].id, i);
      nodeById.set(nodes[i].id, nodes[i]);
    }
  };

  for (const { owner } of fallbackLanes) {
    const ownerNode = nodeById.get(owner);
    if (!ownerNode) continue;

    // Owner must have exactly one non-failure successor (the spine continuation).
    const spineSuccs = nonFailureSuccessors.get(owner) ?? [];
    if (spineSuccs.length !== 1) continue;
    const spineHead = spineSuccs[0];
    const spineNode = nodeById.get(spineHead);
    if (!spineNode) continue;

    // Delta to align owner's cross-axis centre with the spine head's centre.
    const ownerCentre =
      crossAxis === 'x'
        ? ownerNode.x + ownerNode.width / 2
        : ownerNode.y + ownerNode.height / 2;
    const spineCentre =
      crossAxis === 'x'
        ? spineNode.x + spineNode.width / 2
        : spineNode.y + spineNode.height / 2;
    const delta = spineCentre - ownerCentre;
    if (Math.abs(delta) < 0.001) continue;

    // Walk the straight run above the owner.
    // A predecessor is in the run if it has exactly one total successor (this
    // step is its only outgoing edge) and exactly one predecessor (so it is
    // not a merge node that feeds into multiple branches).
    const runIds: string[] = [owner];
    let cur = owner;
    for (;;) {
      const preds = allPredecessors.get(cur) ?? [];
      if (preds.length !== 1) break;
      const pred = preds[0];
      if ((allSuccessors.get(pred) ?? []).length !== 1) break;
      runIds.push(pred);
      cur = pred;
    }

    // Snapshot (replace the relevant array slice).
    const snapshot = nodes.map((n) => n);

    // Apply translation to the straight run.
    const dx = crossAxis === 'x' ? delta : 0;
    const dy = crossAxis === 'y' ? delta : 0;
    for (const id of runIds) {
      const i = nodeIdx.get(id);
      if (i === undefined) continue;
      const n = nodes[i];
      nodes[i] = { ...n, x: n.x + dx, y: n.y + dy };
    }
    refreshMaps();

    // Re-run the repair pass.
    separatePositionedOverlapsInPlace(nodes, crossAxis, nodeSep, groupInnerIds);
    refreshMaps();

    // Accept only if lane order is still valid.
    if (hasLaneOrderViolation(nodeById, graphEdges, crossAxis)) {
      // Revert.
      for (let i = 0; i < nodes.length; i++) {
        nodes[i] = snapshot[i];
      }
      refreshMaps();
    }
  }
};

// ── Edge-point reconciliation (Step 4) ──────────────────────────────────────

/** Cross-axis delta tolerance matching applyDagre's CROSS_AXIS_DELTA_TOLERANCE. */
const RECONCILE_TOLERANCE = 1;

/**
 * Reconcile edge waypoints after all position-mutating passes.
 *
 * Compares each node's current cross-axis centre against its snapshot taken
 * immediately after `dagLayout`. For each edge:
 * - If |Δsource − Δtarget| ≤ RECONCILE_TOLERANCE → translate the waypoints by
 *   the average delta (the same rule `applyDagre` uses, applied post-hoc).
 * - Otherwise → clear the waypoints (straight-line fallback).
 * - If an edge had no waypoints, return the original edge object unchanged
 *   (reference equality for React Flow's `edgePropsAreEqual` memo).
 *
 * This is the single authoritative place that decides edge routing for all
 * position-mutating post-dagre passes. Replaces per-pass ad-hoc edge
 * translation.
 */
export const reconcileEdgePoints = (
  edges: readonly DagPositionedEdge[],
  nodes: readonly DagPositionedNode[],
  initialCentres: ReadonlyMap<string, number>, // node id → cross-axis centre after dagLayout
  crossAxis: 'x' | 'y'
): DagPositionedEdge[] => {
  // Compute current cross-axis centres from the final positioned nodes.
  const currentCentre = new Map(
    nodes.map((n) => [
      n.id,
      crossAxis === 'x' ? n.x + n.width / 2 : n.y + n.height / 2,
    ])
  );

  const delta = (id: string): number => {
    const after = currentCentre.get(id);
    const before = initialCentres.get(id);
    if (after === undefined || before === undefined) return 0;
    return after - before;
  };

  return edges.map((edge) => {
    if (edge.points.length === 0) return edge; // already no waypoints — preserve reference

    const ds = delta(edge.source);
    const dt = delta(edge.target);

    if (Math.abs(ds - dt) <= RECONCILE_TOLERANCE) {
      // Endpoints moved together — translate waypoints by the average delta.
      const avgDelta = (ds + dt) / 2;
      if (Math.abs(avgDelta) < 0.001) return edge; // no movement — preserve reference
      const translated =
        crossAxis === 'x'
          ? edge.points.map((p) => ({ x: p.x + avgDelta, y: p.y }))
          : edge.points.map((p) => ({ x: p.x, y: p.y + avgDelta }));
      return { ...edge, points: translated };
    }

    // Endpoints drifted apart — clear waypoints (straight-line fallback).
    return { ...edge, points: [] };
  });
};
