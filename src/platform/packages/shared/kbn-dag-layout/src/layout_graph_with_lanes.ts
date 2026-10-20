/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyDagre } from './apply_dagre';
import { FORK_HEAD_ALIGN_EPSILON, LANE_CROSS_SHIFT_EPSILON } from './constants';
import type {
  DagEdge,
  DagNode,
  DagPositionedNode,
  DagReservedLane,
  DagReservedLanePlacement,
} from './types';

// ── axis helpers ─────────────────────────────────────────────────────────────

const mainOf = (n: DagPositionedNode, isLR: boolean) => (isLR ? n.x : n.y);
const mainSpanOf = (n: DagPositionedNode, isLR: boolean) => (isLR ? n.width : n.height);
const crossOf = (n: DagPositionedNode, isLR: boolean) => (isLR ? n.y : n.x);
const crossSpanOf = (n: DagPositionedNode, isLR: boolean) => (isLR ? n.height : n.width);

const shiftMain = (n: DagPositionedNode, delta: number, isLR: boolean): DagPositionedNode =>
  isLR ? { ...n, x: n.x + delta } : { ...n, y: n.y + delta };

const shiftCross = (n: DagPositionedNode, delta: number, isLR: boolean): DagPositionedNode =>
  isLR ? { ...n, y: n.y + delta } : { ...n, x: n.x + delta };

/** True if [aStart, aEnd] and [bStart, bEnd] overlap (strictly). */
const intervalsOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && bStart < aEnd;

// ── lane validation ──────────────────────────────────────────────────────────

/**
 * Rejects lane sets the cascade cannot place: a node in two lanes, an owner
 * inside its own lane, lanes owning each other in a cycle, or a lane owned by a
 * spine node at a non-zero depth (only depth-0 lanes are levelled from the spine).
 */
const validateLanes = (nodes: readonly DagNode[], lanes: readonly DagReservedLane[]): void => {
  if (lanes.length === 0) return;

  const laneByNodeId = new Map<string, DagReservedLane>();
  for (const lane of lanes) {
    for (const nid of lane.nodeIds) {
      if (laneByNodeId.has(nid)) {
        throw new Error(`reservedLane invariant: node "${nid}" appears in two lanes`);
      }
      laneByNodeId.set(nid, lane);
    }
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const lane of lanes) {
    const { ownerId, depth } = lane;
    const ownerLane = laneByNodeId.get(ownerId);
    if (ownerLane === lane) {
      throw new Error(`reservedLane invariant: owner "${ownerId}" is inside its own lane`);
    }
    if (!ownerLane && nodeIds.has(ownerId) && depth !== 0) {
      throw new Error(
        `reservedLane invariant: lane owned by spine node "${ownerId}" has depth ${depth}, expected 0`
      );
    }
  }

  // Each lane has one owner, hence at most one parent lane, so following the
  // parent chain from every lane finds any ownership cycle.
  const settled = new Set<DagReservedLane>();
  for (const start of lanes) {
    const chain = new Set<DagReservedLane>();
    let current: DagReservedLane | undefined = start;
    while (current && !settled.has(current)) {
      if (chain.has(current)) {
        throw new Error(
          `reservedLane invariant: ownership cycle through owner "${current.ownerId}"`
        );
      }
      chain.add(current);
      current = laneByNodeId.get(current.ownerId);
    }
    for (const lane of chain) settled.add(lane);
  }
};

// ── shared state ─────────────────────────────────────────────────────────────

type Adjacency = ReadonlyMap<string, readonly string[]>;

/** Everything the post-dagre phases read; `spineById` and `laneNodeById` are mutated in place. */
interface LaneLayoutContext {
  readonly isLR: boolean;
  readonly nodeSep: number;
  readonly rankSep: number;
  /** Lanes ordered by depth, then by the owner's main position after dagre. */
  readonly sortedLanes: readonly DagReservedLane[];
  /** Lanes grouped by owner, each bucket in `sortedLanes` order. */
  readonly lanesByOwner: ReadonlyMap<string, readonly DagReservedLane[]>;
  /** Each owner's first position in `sortedLanes`. */
  readonly ownerRank: ReadonlyMap<string, number>;
  /** Each lane's nodes as dagre placed them; live positions are tracked in `laneNodeById`. */
  readonly laneLayouts: ReadonlyMap<DagReservedLane, readonly DagPositionedNode[]>;
  readonly spineById: Map<string, DagPositionedNode>;
  readonly laneNodeById: Map<string, DagPositionedNode>;
  readonly spineAdj: Adjacency;
  readonly spineRevAdj: Adjacency;
  readonly spineSuccessorsOf: (startId: string) => Set<string>;
  readonly laneSuccessorsOf: (startId: string) => Set<string>;
}

// ── graph helpers ────────────────────────────────────────────────────────────

const appendTo = (map: Map<string, string[]>, key: string, value: string): void => {
  const bucket = map.get(key);
  if (bucket) {
    bucket.push(value);
  } else {
    map.set(key, [value]);
  }
};

/** Breadth-first reachability from `startId`, excluding it unless a cycle returns to it. */
const bfs = (adjacency: Adjacency, startId: string): Set<string> => {
  const visited = new Set<string>();
  const queue = [startId];
  for (let head = 0; head < queue.length; head++) {
    for (const next of adjacency.get(queue[head]) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
};

/** Memoised `bfs`: avoids repeated traversals for the same start node. */
const memoizeReachability = (adjacency: Adjacency): ((startId: string) => Set<string>) => {
  const cache = new Map<string, Set<string>>();
  return (startId) => {
    const cached = cache.get(startId);
    if (cached) return cached;
    const reachable = bfs(adjacency, startId);
    cache.set(startId, reachable);
    return reachable;
  };
};

/** Current positions of a lane's nodes, in the lane's dagre order. */
const currentLanePositions = (ctx: LaneLayoutContext, lane: DagReservedLane): DagPositionedNode[] =>
  (ctx.laneLayouts.get(lane) ?? []).map((n) => ctx.laneNodeById.get(n.id) ?? n);

/**
 * Pushes every node of `successorIds` found in `store` down the main axis by the
 * same amount so the earliest of them starts at `required`. No-op when none exist
 * or the earliest already starts at or past `required`.
 */
const pushSuccessors = (
  store: Map<string, DagPositionedNode>,
  successorIds: Iterable<string>,
  required: number,
  isLR: boolean
): void => {
  // Only the earliest successor's main start is read, so a min scan stands in
  // for sorting every successor.
  let successorMainStart = Infinity;
  let hasSuccessor = false;
  for (const id of successorIds) {
    const successor = store.get(id);
    if (!successor) continue;
    hasSuccessor = true;
    successorMainStart = Math.min(successorMainStart, mainOf(successor, isLR));
  }
  if (!hasSuccessor) return;

  const deficit = Math.max(0, required - successorMainStart);
  if (deficit === 0) return;

  for (const id of successorIds) {
    const n = store.get(id);
    if (n) store.set(id, shiftMain(n, deficit, isLR));
  }
};

// ── 1. Partition nodes ───────────────────────────────────────────────────────

const partitionNodes = (nodes: readonly DagNode[], lanes: readonly DagReservedLane[]) => {
  const laneByNodeId = new Map<string, DagReservedLane>();
  for (const lane of lanes) {
    for (const nid of lane.nodeIds) {
      laneByNodeId.set(nid, lane);
    }
  }

  const spineNodes = nodes.filter((n) => !laneByNodeId.has(n.id));

  // First node wins for a repeated id, matching `Array.prototype.find`.
  const inputNodeById = new Map<string, DagNode>();
  for (const n of nodes) {
    if (!inputNodeById.has(n.id)) inputNodeById.set(n.id, n);
  }

  // Nodes per lane (maintaining their DagNode size info for dagre).
  const laneNodes = new Map<DagReservedLane, DagNode[]>();
  for (const lane of lanes) {
    laneNodes.set(
      lane,
      lane.nodeIds.map((id) => {
        const n = inputNodeById.get(id);
        if (!n) throw new Error(`reservedLane node "${id}" not found in input nodes`);
        return n;
      })
    );
  }

  return { laneByNodeId, spineNodes, laneNodes };
};

// ── 2. Partition edges ───────────────────────────────────────────────────────

const partitionEdges = (
  edges: readonly DagEdge[],
  lanes: readonly DagReservedLane[],
  laneByNodeId: ReadonlyMap<string, DagReservedLane>
) => {
  const spineEdges: DagEdge[] = [];
  const laneInternalEdges = new Map<DagReservedLane, DagEdge[]>();

  for (const lane of lanes) laneInternalEdges.set(lane, []);

  for (const edge of edges) {
    const sourceLane = laneByNodeId.get(edge.source);
    const targetLane = laneByNodeId.get(edge.target);
    if (!sourceLane && !targetLane) {
      spineEdges.push(edge);
    } else if (sourceLane && targetLane && sourceLane === targetLane) {
      laneInternalEdges.get(sourceLane)?.push(edge);
    }
    // Otherwise the edge crosses a lane boundary and must NOT enter any dagre run.
  }

  return { spineEdges, laneInternalEdges };
};

// ── 4+5. Level heads and push spine (interleaved, top-down per spine owner) ──
//
// The cascade rule (D3, revised): each lane head starts one rank below its
// owner — `headMainStart = ownerMainEnd + rankSep`. Applied recursively so
// nested lanes cascade like a staircase (D12). The band starts at the owner's
// main start so the owner is always an obstacle for cross-origin placement (Fix 5).
//
// Interleaved with the spine push (D7): for each spine owner top-down:
//   1. levelLaneCascade — drop the head one rank below the owner, recurse.
//   2. subtreeMainEnd   — full main extent of this lane and all nested lanes.
//   3. pushSpineAfter   — first spine successor starts at extent + rankSep.
//
// Interleaving means a push from O1 moves O2 before O2's cascade is levelled,
// so O2's head lands correctly relative to O2's pushed position (Fix 2).

/** Full main extent of a lane plus all lanes nested under it (Fix 3, D7). */
const subtreeMainEnd = (ctx: LaneLayoutContext, lane: DagReservedLane): number => {
  const { isLR, lanesByOwner, laneLayouts } = ctx;
  const positions = currentLanePositions(ctx, lane);
  if (positions.length === 0) return -Infinity;
  let maxEnd = Math.max(...positions.map((n) => mainOf(n, isLR) + mainSpanOf(n, isLR)));
  for (const { id } of laneLayouts.get(lane) ?? []) {
    for (const nestedLane of lanesByOwner.get(id) ?? []) {
      maxEnd = Math.max(maxEnd, subtreeMainEnd(ctx, nestedLane));
    }
  }
  return maxEnd;
};

/**
 * Level this lane and all nested lanes recursively (depth-first pre-order).
 * ownerId is looked up fresh from spineById / laneNodeById on each call so
 * it reflects any pushes already applied to the owner.
 */
const levelLaneCascade = (ctx: LaneLayoutContext, lane: DagReservedLane, ownerId: string): void => {
  const { isLR, rankSep, spineById, laneNodeById, lanesByOwner, ownerRank } = ctx;
  const currentOwner = spineById.get(ownerId) ?? laneNodeById.get(ownerId);
  if (!currentOwner) return;
  const positions = currentLanePositions(ctx, lane);
  if (positions.length === 0) return;

  // head = first lane node in dagre's main-axis order (minimum main start).
  const currentHead = positions.reduce((min, cur) =>
    mainOf(cur, isLR) < mainOf(min, isLR) ? cur : min
  );

  // Cascade: head starts one rank below the owner (Fix 1, D3-revised).
  const ownerMainEnd = mainOf(currentOwner, isLR) + mainSpanOf(currentOwner, isLR);
  const headMainStart = mainOf(currentHead, isLR);
  const mainDelta = Math.round(ownerMainEnd + rankSep - headMainStart);

  if (mainDelta !== 0) {
    for (const cur of positions) {
      laneNodeById.set(cur.id, shiftMain(cur, mainDelta, isLR));
    }
  }

  // Recursively cascade nested lanes, top-down by owner's current main position
  // (depth-first pre-order). After each nested lane is cascaded, push THIS lane's
  // own in-lane successors of the nested owner so they clear the nested lane's
  // full subtree — the same D7 rule the spine loop applies below (§5), scoped to
  // lane-internal topology so a sibling branch inside this lane is not pushed
  // (Fix 6 parity). Without this, a `continue` rejoin out of a nested fallback
  // can run backward into a sibling step that never moved.
  const laneNodeIdSet = new Set(positions.map((n) => n.id));
  const laneNodeMain = (id: string): number => {
    const n = laneNodeById.get(id);
    return n ? mainOf(n, isLR) : 0;
  };
  // Rank-ordering first keeps the first-owner-in-`sortedLanes` order as the sort tie-break.
  const nestedOwnerIds = [...laneNodeIdSet]
    .filter((id) => lanesByOwner.has(id))
    .sort((a, b) => (ownerRank.get(a) ?? 0) - (ownerRank.get(b) ?? 0))
    .sort((a, b) => laneNodeMain(a) - laneNodeMain(b));

  for (const nestedOwnerId of nestedOwnerIds) {
    for (const nestedLane of lanesByOwner.get(nestedOwnerId) ?? []) {
      levelLaneCascade(ctx, nestedLane, nestedOwnerId);

      // Measure the nested lane's (and anything nested under it) full extent,
      // then push this lane's in-lane successors of nestedOwnerId to clear it.
      const required = subtreeMainEnd(ctx, nestedLane) + rankSep;
      const nestedOwnerSuccessors = ctx.laneSuccessorsOf(nestedOwnerId);
      const successorsInLane = [...laneNodeIdSet].filter((id) => nestedOwnerSuccessors.has(id));
      pushSuccessors(laneNodeById, successorsInLane, required, isLR);
    }
  }
};

// ── 3.5. Align fork heads (post-dagre rank correction) ──────────────────────
//
// Dagre's tight-tree ranker assigns the shorter branch of an if/switch/parallel
// fork to a later rank to tighten the edge to the merge node. For example, with
// then: [A, B] and else: [C], dagre puts C at rank 2 (tight C→merge) instead of
// rank 1 (parallel to A). The D7 topology push then leaves C stranded between
// the then head and the pushed loop step, producing an asymmetric fork.
//
// Fix: for each spine node with 2+ outgoing edges (a fork), move all fork heads
// to the minimum main position among them. After this, all fork heads share rank 1
// and the topology push correctly skips them (they are not successors of the owner).
//
// Guards — only align a target when ALL of these hold:
//   1. No sibling target is reachable from it (transitive-successor / shortcut
//      edge guard). Shape a→b, a→c, b→c: c is reachable from b, so c is excluded
//      and the pair is not alignable.
//   2. Its sole spine predecessor is the fork source. If a target has an external
//      predecessor p→q→c (with a→c also present), dagre placed c at a later rank
//      to satisfy p→q→c. Pulling c up to b's rank would make q→c same-rank or
//      backward. Only genuine fork heads have exactly one predecessor (the gate).

const alignForkHeads = (ctx: LaneLayoutContext): void => {
  const { isLR, spineById, spineAdj, spineRevAdj, spineSuccessorsOf } = ctx;
  for (const [forkSource, targets] of spineAdj) {
    if (targets.length < 2) continue;
    const targetNodes = targets.flatMap((t) => {
      const n = spineById.get(t);
      return n ? [n] : [];
    });
    if (targetNodes.length < 2) continue;
    // Guard 1: exclude any target reachable from a sibling target (shortcut edge).
    // Guard 2: exclude any target whose spine predecessor is not solely the fork source.
    const alignable = targetNodes.filter((n) => {
      const reachableFromSibling = targetNodes.some(
        (o) => o.id !== n.id && spineSuccessorsOf(o.id).has(n.id)
      );
      if (reachableFromSibling) return false;
      const predecessors = spineRevAdj.get(n.id) ?? [];
      const hasExternalPredecessor = predecessors.some((p) => p !== forkSource);
      return !hasExternalPredecessor;
    });
    if (alignable.length < 2) continue;
    const minMain = Math.min(...alignable.map((n) => mainOf(n, isLR)));
    for (const n of alignable) {
      const curMain = mainOf(n, isLR);
      if (curMain > minMain + FORK_HEAD_ALIGN_EPSILON) {
        spineById.set(n.id, shiftMain(n, minMain - curMain, isLR));
      }
    }
  }
};

/**
 * Process spine owners top-down; each push applies before the next owner is
 * visited so every owner's position is final when we level its lanes.
 */
const levelLanesAndPushSpine = (ctx: LaneLayoutContext): void => {
  const { isLR, rankSep, spineById, sortedLanes, lanesByOwner } = ctx;
  const depth0OwnerIds = new Set(sortedLanes.filter((l) => l.depth === 0).map((l) => l.ownerId));
  const spineOwnersTopDown = [...spineById.values()]
    .filter((n) => depth0OwnerIds.has(n.id))
    .sort((a, b) => mainOf(a, isLR) - mainOf(b, isLR));

  for (const ownerSnapshot of spineOwnersTopDown) {
    // Read current position — may have been pushed by a prior owner.
    const owner = spineById.get(ownerSnapshot.id);
    if (!owner) continue;
    const depth0OwnedLanes = (lanesByOwner.get(owner.id) ?? []).filter((l) => l.depth === 0);

    for (const lane of depth0OwnedLanes) {
      // 1. Level this lane's cascade.
      levelLaneCascade(ctx, lane, owner.id);

      // 2. Measure the subtree's main extent.
      const required = subtreeMainEnd(ctx, lane) + rankSep;

      // 3. Push the spine so the first successor starts at `required`.
      //    Use topology (transitive reachability via spine edges) to select only
      //    real successors — parallel branches must not be pushed (Fix 6). Using
      //    `mainOf(n) >= successorMainStart` would also move parallel branches that
      //    happen to share the same Y as the first successor, e.g. the else-branch
      //    of an if-fork whose owner is in the then-branch.
      pushSuccessors(spineById, ctx.spineSuccessorsOf(owner.id), required, isLR);
    }
  }
};

// ── 6. Compute cross origins (shallowest-first, top-down within each depth) ─
//
// Placed lanes are accumulated as additional obstacles for later (deeper) lanes.
// Shallowest-first ensures a parent lane is placed before its child, making the
// parent an obstacle for the child — guaranteeing depth monotonicity outward.
//
// The band starts at the OWNER's main start, not the lane head (Fix 5, D5).
// Required because after the cascade drop (Fix 1) and spine push (D7), the
// lane's own node band sits below the owner and contains no spine node (D7
// pushed them away). Without Fix 5 the owner would not be an obstacle, maxCrossEnd
// would fall back to -Infinity, origin to 0, and every lane would land on the spine.

const placeLanesOnCross = (ctx: LaneLayoutContext): DagReservedLanePlacement[] => {
  const { isLR, nodeSep, spineById, laneNodeById, sortedLanes } = ctx;
  const placedLanePlacements: DagReservedLanePlacement[] = [];

  // Spine bands are final from here on; measure them once for the per-lane obstacle scans.
  const spineBands = [...spineById.values()].map((n) => ({
    mainStart: mainOf(n, isLR),
    mainEnd: mainOf(n, isLR) + mainSpanOf(n, isLR),
    crossEnd: crossOf(n, isLR) + crossSpanOf(n, isLR),
  }));

  for (const lane of sortedLanes) {
    const laneNodePositions = currentLanePositions(ctx, lane);
    if (laneNodePositions.length === 0) continue;

    // Band: owner main start → lane node max end (Fix 5).
    const ownerPos = spineById.get(lane.ownerId) ?? laneNodeById.get(lane.ownerId);
    const laneMainStart = ownerPos
      ? mainOf(ownerPos, isLR)
      : Math.min(...laneNodePositions.map((n) => mainOf(n, isLR)));
    const laneMainEnd = Math.max(
      ...laneNodePositions.map((n) => mainOf(n, isLR) + mainSpanOf(n, isLR))
    );

    // Max cross right-edge across obstacles: spine nodes and already-placed lanes
    // whose main interval intersects band(L).
    let maxObstacleCrossEnd = -Infinity;
    for (const band of spineBands) {
      if (intervalsOverlap(laneMainStart, laneMainEnd, band.mainStart, band.mainEnd)) {
        maxObstacleCrossEnd = Math.max(maxObstacleCrossEnd, band.crossEnd);
      }
    }
    for (const pl of placedLanePlacements) {
      if (intervalsOverlap(laneMainStart, laneMainEnd, pl.mainStart, pl.mainEnd)) {
        maxObstacleCrossEnd = Math.max(maxObstacleCrossEnd, pl.crossEnd);
      }
    }

    const origin = maxObstacleCrossEnd === -Infinity ? 0 : maxObstacleCrossEnd + nodeSep;
    const laneCrossMin = Math.min(...laneNodePositions.map((n) => crossOf(n, isLR)));
    const crossDelta = origin - laneCrossMin;

    // Apply cross shift to lane nodes.
    if (Math.abs(crossDelta) > LANE_CROSS_SHIFT_EPSILON) {
      for (const n of laneNodePositions) {
        laneNodeById.set(n.id, shiftCross(n, crossDelta, isLR));
      }
    }

    // Record this lane's placement for use as an obstacle by later (deeper) lanes.
    const updatedPositions = currentLanePositions(ctx, lane);
    const crossStart = Math.min(...updatedPositions.map((n) => crossOf(n, isLR)));
    const crossEnd = Math.max(
      ...updatedPositions.map((n) => crossOf(n, isLR) + crossSpanOf(n, isLR))
    );
    const mainStart = Math.min(...updatedPositions.map((n) => mainOf(n, isLR)));
    const mainEnd = Math.max(...updatedPositions.map((n) => mainOf(n, isLR) + mainSpanOf(n, isLR)));

    placedLanePlacements.push({ ownerId: lane.ownerId, crossStart, crossEnd, mainStart, mainEnd });
  }

  return placedLanePlacements;
};

// ── main export ──────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for a bare `applyDagre` call when reserved lanes are
 * present. Lane nodes are removed from dagre's input and placed in the +cross
 * margin after the spine layout runs.
 *
 * Invariants produced (all axes use the direction-dependent helpers above):
 * - Every lane head starts one rank below its owner's main-axis end (D3, cascade).
 * - The spine below every owner clears the lane's full subtree main extent (D7).
 *   The same clearance applies one level in: a parent lane's own successors of a
 *   nested lane's owner clear that nested lane's full subtree too, so a `continue`
 *   rejoin out of a nested fallback never runs backward.
 * - Every lane's inner (−cross) edge is ≥ nodeSep past the cross extent of all
 *   spine nodes sharing the lane's main band (D5 — local hugging).
 * - Deeper lanes are always further out than shallower lanes containing their
 *   owner (depth monotonicity within a chain).
 * - Lane nodes are tagged `crossPinned: true`.
 * - Boundary edges (exactly one endpoint in a lane) take no part in any dagre run.
 *
 * Handles an empty `lanes` array like `applyDagre` plus fork-head alignment (§3.5).
 */
export function layoutGraphWithLanes(
  nodes: readonly DagNode[],
  edges: readonly DagEdge[],
  lanes: readonly DagReservedLane[],
  direction: 'TB' | 'LR',
  nodeSep: number,
  rankSep: number
): {
  nodes: DagPositionedNode[];
  lanePlacements: DagReservedLanePlacement[];
} {
  const isLR = direction === 'LR';

  validateLanes(nodes, lanes);

  const { laneByNodeId, spineNodes, laneNodes } = partitionNodes(nodes, lanes);
  const { spineEdges, laneInternalEdges } = partitionEdges(edges, lanes, laneByNodeId);

  // ── 3. Run dagre on spine and each lane independently ────────────────────

  const spineLayout =
    spineNodes.length > 0 ? applyDagre(spineNodes, spineEdges, direction, nodeSep, rankSep) : [];

  const laneLayouts = new Map<DagReservedLane, DagPositionedNode[]>();
  for (const lane of lanes) {
    const ln = laneNodes.get(lane) ?? [];
    const le = laneInternalEdges.get(lane) ?? [];
    laneLayouts.set(lane, ln.length > 0 ? applyDagre(ln, le, direction, nodeSep, rankSep) : []);
  }

  // Mutable node store — update in place throughout.
  const spineById = new Map<string, DagPositionedNode>(spineLayout.map((n) => [n.id, n]));

  const laneNodeById = new Map<string, DagPositionedNode>();
  for (const [, layout] of laneLayouts) {
    for (const n of layout) laneNodeById.set(n.id, n);
  }

  const sortedLanes = [...lanes].sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    const aOwner = spineById.get(a.ownerId) ?? laneNodeById.get(a.ownerId);
    const bOwner = spineById.get(b.ownerId) ?? laneNodeById.get(b.ownerId);
    return (aOwner ? mainOf(aOwner, isLR) : 0) - (bOwner ? mainOf(bOwner, isLR) : 0);
  });

  // Lanes grouped by owner, each bucket in `sortedLanes` order; `ownerRank` is the
  // owner's first position in `sortedLanes`. Built once so the recursive passes
  // look nested lanes up by owner instead of re-filtering every lane per call.
  const lanesByOwner = new Map<string, DagReservedLane[]>();
  const ownerRank = new Map<string, number>();
  for (const lane of sortedLanes) {
    const bucket = lanesByOwner.get(lane.ownerId);
    if (bucket) {
      bucket.push(lane);
    } else {
      lanesByOwner.set(lane.ownerId, [lane]);
      ownerRank.set(lane.ownerId, ownerRank.size);
    }
  }

  // Spine adjacency for topology-based successor lookup (Fix 6): D7 push must only
  // move actual spine successors of the owner — not parallel branches that happen to
  // share a similar main-axis position. Using centre-y comparison would push
  // else-branch nodes when they are at the same rank as a then-branch owner, moving
  // them far below the Loop Step. The same map and reachability function also serve
  // as the shortcut-edge guard inside §3.5.
  const spineAdj = new Map<string, string[]>();
  // Reverse adjacency: target → sources. Used by §3.5 to exclude any fork-head
  // candidate that has an external predecessor (i.e. one that is not the fork
  // source), which dagre placed at a later rank to satisfy that constraint.
  // Pulling such a target up to the minimum fork-head rank would produce a
  // same-rank or backward edge from its external predecessor.
  const spineRevAdj = new Map<string, string[]>();
  for (const e of spineEdges) {
    appendTo(spineAdj, e.source, e.target);
    appendTo(spineRevAdj, e.target, e.source);
  }

  // Lane-internal adjacency, used by levelLaneCascade's in-lane D7 push: the
  // successors (within a PARENT lane) of a NESTED lane's owner must clear that
  // nested lane's subtree. Node ids are unique across the whole graph, so every
  // lane's internal edges can be merged into one map — reachability from a node
  // in lane L can only traverse edges internal to L (boundary edges, which leave
  // L, are excluded from laneInternalEdges), so this naturally stays lane-scoped.
  const laneAdj = new Map<string, string[]>();
  for (const [, laneEdges] of laneInternalEdges) {
    for (const e of laneEdges) appendTo(laneAdj, e.source, e.target);
  }

  const ctx: LaneLayoutContext = {
    isLR,
    nodeSep,
    rankSep,
    sortedLanes,
    lanesByOwner,
    ownerRank,
    laneLayouts,
    spineById,
    laneNodeById,
    spineAdj,
    spineRevAdj,
    spineSuccessorsOf: memoizeReachability(spineAdj),
    laneSuccessorsOf: memoizeReachability(laneAdj),
  };

  alignForkHeads(ctx);
  levelLanesAndPushSpine(ctx);
  const placedLanePlacements = placeLanesOnCross(ctx);

  // ── 7. Merge nodes ───────────────────────────────────────────────────────

  const finalNodes: DagPositionedNode[] = [
    ...spineById.values(),
    ...[...laneNodeById.values()].map((n) => ({ ...n, crossPinned: true })),
  ];

  return { nodes: finalNodes, lanePlacements: placedLanePlacements };
}
