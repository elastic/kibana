/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyDagre } from './apply_dagre';
import { translateEdgePoints } from './align_cross_axis';
import type {
  DagEdge,
  DagNode,
  DagPositionedEdge,
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

// ── main export ──────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for a bare `applyDagre` call when reserved lanes are
 * present. Lane nodes are removed from dagre's input and placed in the +cross
 * margin after the spine layout runs.
 *
 * Invariants produced (all axes use the direction-dependent helpers above):
 * - Every lane head starts one rank below its owner's main-axis end (D3, cascade).
 * - The spine below every owner clears the lane's full subtree main extent (D7).
 * - Every lane's inner (−cross) edge is ≥ nodeSep past the cross extent of all
 *   spine nodes sharing the lane's main band (D5 — local hugging).
 * - Deeper lanes are always further out than shallower lanes containing their
 *   owner (depth monotonicity within a chain).
 * - Lane nodes are tagged `crossPinned: true`.
 * - Boundary edges (exactly one endpoint in a lane) are returned with `points: []`.
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
  edges: DagPositionedEdge[];
  lanePlacements: DagReservedLanePlacement[];
} {
  const isLR = direction === 'LR';

  // ── 1. Partition nodes ───────────────────────────────────────────────────

  const laneByNodeId = new Map<string, DagReservedLane>();
  for (const lane of lanes) {
    for (const nid of lane.nodeIds) {
      laneByNodeId.set(nid, lane);
    }
  }

  const spineNodes = nodes.filter((n) => !laneByNodeId.has(n.id));

  // Nodes per lane (maintaining their DagNode size info for dagre).
  const laneNodes = new Map<DagReservedLane, DagNode[]>();
  for (const lane of lanes) {
    laneNodes.set(
      lane,
      lane.nodeIds.map((id) => {
        const n = nodes.find((x) => x.id === id);
        if (!n) throw new Error(`reservedLane node "${id}" not found in input nodes`);
        return n;
      })
    );
  }

  // ── 2. Partition edges ───────────────────────────────────────────────────

  const spineEdges: DagEdge[] = [];
  const laneInternalEdges = new Map<DagReservedLane, DagEdge[]>();
  const boundaryEdges: DagEdge[] = [];

  for (const lane of lanes) laneInternalEdges.set(lane, []);

  for (const edge of edges) {
    const sourceLane = laneByNodeId.get(edge.source);
    const targetLane = laneByNodeId.get(edge.target);
    if (!sourceLane && !targetLane) {
      spineEdges.push(edge);
    } else if (sourceLane && targetLane && sourceLane === targetLane) {
      laneInternalEdges.get(sourceLane)!.push(edge);
    } else {
      // Crosses a lane boundary — boundary edge: must NOT enter any dagre run.
      boundaryEdges.push(edge);
    }
  }

  // ── 3. Run dagre on spine and each lane independently ────────────────────

  const spineLayout =
    spineNodes.length > 0
      ? applyDagre(spineNodes, spineEdges, direction, nodeSep, rankSep)
      : { nodes: [], edges: [] };

  const laneLayouts = new Map<
    DagReservedLane,
    { nodes: DagPositionedNode[]; edges: DagPositionedEdge[] }
  >();
  for (const lane of lanes) {
    const ln = laneNodes.get(lane)!;
    const le = laneInternalEdges.get(lane)!;
    if (ln.length > 0) {
      laneLayouts.set(lane, applyDagre(ln, le, direction, nodeSep, rankSep));
    } else {
      laneLayouts.set(lane, { nodes: [], edges: [] });
    }
  }

  // Mutable node store — update in place throughout.
  const spineById = new Map<string, DagPositionedNode>(spineLayout.nodes.map((n) => [n.id, n]));

  const laneNodeById = new Map<string, DagPositionedNode>();
  for (const [, layout] of laneLayouts) {
    for (const n of layout.nodes) laneNodeById.set(n.id, n);
  }

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

  const sortedLanes = [...lanes].sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    const aOwner = spineById.get(a.ownerId) ?? laneNodeById.get(a.ownerId);
    const bOwner = spineById.get(b.ownerId) ?? laneNodeById.get(b.ownerId);
    return (aOwner ? mainOf(aOwner, isLR) : 0) - (bOwner ? mainOf(bOwner, isLR) : 0);
  });

  // Level this lane and all nested lanes recursively (depth-first pre-order).
  // ownerId is looked up fresh from spineById / laneNodeById on each call so
  // it reflects any pushes already applied to the owner.
  function levelLaneCascade(lane: DagReservedLane, ownerId: string): void {
    const currentOwner = spineById.get(ownerId) ?? laneNodeById.get(ownerId);
    if (!currentOwner) return;
    const laneLayout = laneLayouts.get(lane)!;
    if (laneLayout.nodes.length === 0) return;

    // head = first lane node in dagre's main-axis order (minimum main start).
    const head = laneLayout.nodes.reduce((min, n) => {
      const cur = laneNodeById.get(n.id) ?? n;
      const minN = laneNodeById.get(min.id) ?? min;
      return mainOf(cur, isLR) < mainOf(minN, isLR) ? n : min;
    });
    const currentHead = laneNodeById.get(head.id) ?? head;

    // Cascade: head starts one rank below the owner (Fix 1, D3-revised).
    const ownerMainEnd = mainOf(currentOwner, isLR) + mainSpanOf(currentOwner, isLR);
    const headMainStart = mainOf(currentHead, isLR);
    const mainDelta = Math.round(ownerMainEnd + rankSep - headMainStart);

    if (mainDelta !== 0) {
      for (const n of laneLayout.nodes) {
        const cur = laneNodeById.get(n.id) ?? n;
        laneNodeById.set(n.id, shiftMain(cur, mainDelta, isLR));
      }
      laneLayouts.set(lane, {
        nodes: laneLayout.nodes.map((n) => laneNodeById.get(n.id)!),
        edges: laneLayout.edges.map((e) => ({
          ...e,
          points: translateEdgePoints(e.points, isLR ? mainDelta : 0, isLR ? 0 : mainDelta),
        })),
      });
    }

    // Recursively cascade nested lanes (depth-first pre-order).
    const laneNodeIdSet = new Set(laneLayout.nodes.map((n) => n.id));
    for (const nestedLane of sortedLanes) {
      if (laneNodeIdSet.has(nestedLane.ownerId)) {
        levelLaneCascade(nestedLane, nestedLane.ownerId);
      }
    }
  }

  // Full main extent of a lane plus all lanes nested under it (Fix 3, D7).
  function subtreeMainEnd(lane: DagReservedLane): number {
    const laneLayout = laneLayouts.get(lane)!;
    if (laneLayout.nodes.length === 0) return -Infinity;
    let maxEnd = Math.max(
      ...laneLayout.nodes.map((n) => {
        const cur = laneNodeById.get(n.id)!;
        return mainOf(cur, isLR) + mainSpanOf(cur, isLR);
      })
    );
    const laneNodeIdSet = new Set(laneLayout.nodes.map((n) => n.id));
    for (const nestedLane of sortedLanes) {
      if (laneNodeIdSet.has(nestedLane.ownerId)) {
        maxEnd = Math.max(maxEnd, subtreeMainEnd(nestedLane));
      }
    }
    return maxEnd;
  }

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
  const repositionedByAlignment = new Set<string>();
  {
    const outTargetsBySource = new Map<string, string[]>();
    for (const e of spineEdges) {
      if (!outTargetsBySource.has(e.source)) outTargetsBySource.set(e.source, []);
      outTargetsBySource.get(e.source)!.push(e.target);
    }
    for (const targets of outTargetsBySource.values()) {
      if (targets.length < 2) continue;
      const targetNodes = targets.flatMap((t) => {
        const n = spineById.get(t);
        return n ? [n] : [];
      });
      if (targetNodes.length < 2) continue;
      const minMain = Math.min(...targetNodes.map((n) => mainOf(n, isLR)));
      for (const n of targetNodes) {
        const curMain = mainOf(n, isLR);
        if (curMain > minMain + 0.001) {
          spineById.set(n.id, shiftMain(n, minMain - curMain, isLR));
          repositionedByAlignment.add(n.id);
        }
      }
    }
    // Clear stale dagre waypoints for edges whose endpoint was realigned.
    if (repositionedByAlignment.size > 0) {
      spineLayout.edges.forEach((e, i) => {
        if (repositionedByAlignment.has(e.source) || repositionedByAlignment.has(e.target)) {
          spineLayout.edges[i] = { ...e, points: [] };
        }
      });
    }
  }

  // Build a spine adjacency list for topology-based successor lookup (Fix 6).
  // D7 push must only move actual spine successors of the owner — not parallel
  // branches that happen to share a similar main-axis position. Using centre-y
  // comparison would push else-branch nodes when they are at the same rank as
  // a then-branch owner, moving them far below the Loop Step.
  const spineAdj = new Map<string, string[]>();
  for (const e of spineEdges) {
    if (!spineAdj.has(e.source)) spineAdj.set(e.source, []);
    spineAdj.get(e.source)!.push(e.target);
  }

  function getTransitiveSuccessors(startId: string): Set<string> {
    const visited = new Set<string>();
    const queue = [startId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      for (const next of spineAdj.get(id) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    return visited;
  }

  // Process spine owners top-down; each push applies before the next owner is
  // visited so every owner's position is final when we level its lanes.
  const spineOwnersTopDown = [...spineById.values()]
    .filter((n) => sortedLanes.some((l) => l.depth === 0 && l.ownerId === n.id))
    .sort((a, b) => mainOf(a, isLR) - mainOf(b, isLR));

  for (const ownerSnapshot of spineOwnersTopDown) {
    // Read current position — may have been pushed by a prior owner.
    const owner = spineById.get(ownerSnapshot.id)!;
    const depth0OwnedLanes = sortedLanes.filter((l) => l.depth === 0 && l.ownerId === owner.id);

    for (const lane of depth0OwnedLanes) {
      // 1. Level this lane's cascade.
      levelLaneCascade(lane, owner.id);

      // 2. Measure the subtree's main extent.
      const required = subtreeMainEnd(lane) + rankSep;

      // 3. Push the spine so the first successor starts at `required`.
      //    Use topology (transitive reachability via spine edges) to select only
      //    real successors — parallel branches must not be pushed (Fix 6).
      const ownerSuccessors = getTransitiveSuccessors(owner.id);
      const successors = [...spineById.values()]
        .filter((n) => ownerSuccessors.has(n.id))
        .sort((a, b) => mainOf(a, isLR) - mainOf(b, isLR));

      if (successors.length === 0) continue; // owner is the last spine node

      const firstSuccessor = successors[0];
      const successorMainStart = mainOf(firstSuccessor, isLR);
      const deficit = Math.max(0, required - successorMainStart);

      if (deficit > 0) {
        // Shift only topological successors of the owner (Fix 6).
        // Using `mainOf(n) >= successorMainStart` would also move parallel
        // branches that happen to share the same Y as the first successor, e.g.
        // the else-branch of an if-fork whose owner is in the then-branch.
        for (const n of [...spineById.values()]) {
          if (ownerSuccessors.has(n.id)) {
            spineById.set(n.id, shiftMain(n, deficit, isLR));
          }
        }
        // Translate spine edges across the push boundary.
        spineLayout.edges.forEach((e, i) => {
          const targetPushed = ownerSuccessors.has(e.target);
          const sourcePushed = ownerSuccessors.has(e.source);
          if (targetPushed) {
            if (e.source === owner.id) {
              // Owner → successor is straight (same column), clear waypoints.
              spineLayout.edges[i] = { ...e, points: [] };
            } else if (sourcePushed) {
              // Both endpoints were pushed — translate.
              spineLayout.edges[i] = {
                ...e,
                points: translateEdgePoints(e.points, isLR ? deficit : 0, isLR ? 0 : deficit),
              };
            } else {
              // Edge crosses the push boundary — clear waypoints.
              spineLayout.edges[i] = { ...e, points: [] };
            }
          }
        });
      }
    }
  }

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

  const placedLanePlacements: DagReservedLanePlacement[] = [];

  for (const lane of sortedLanes) {
    const laneLayout = laneLayouts.get(lane)!;
    if (laneLayout.nodes.length === 0) continue;

    const laneNodePositions = laneLayout.nodes.map((n) => laneNodeById.get(n.id) ?? n);

    // Band: owner main start → lane node max end (Fix 5).
    const ownerPos = spineById.get(lane.ownerId) ?? laneNodeById.get(lane.ownerId);
    const laneMainStart = ownerPos
      ? mainOf(ownerPos, isLR)
      : Math.min(...laneNodePositions.map((n) => mainOf(n, isLR)));
    const laneMainEnd = Math.max(
      ...laneNodePositions.map((n) => mainOf(n, isLR) + mainSpanOf(n, isLR))
    );

    // Spine nodes whose main interval intersects band(L).
    const obstacleSpineNodes = [...spineById.values()].filter((n) => {
      const nMain = mainOf(n, isLR);
      const nMainEnd = nMain + mainSpanOf(n, isLR);
      return intervalsOverlap(laneMainStart, laneMainEnd, nMain, nMainEnd);
    });

    // Already-placed lanes whose main interval intersects band(L).
    const obstacleFromPlacedLanes = placedLanePlacements.filter((pl) =>
      intervalsOverlap(laneMainStart, laneMainEnd, pl.mainStart, pl.mainEnd)
    );

    // Max cross right-edge across all obstacles.
    const maxObstacleCrossEnd = Math.max(
      ...obstacleSpineNodes.map((n) => crossOf(n, isLR) + crossSpanOf(n, isLR)),
      ...obstacleFromPlacedLanes.map((pl) => pl.crossEnd),
      -Infinity
    );

    const origin = maxObstacleCrossEnd === -Infinity ? 0 : maxObstacleCrossEnd + nodeSep;
    const laneCrossMin = Math.min(...laneNodePositions.map((n) => crossOf(n, isLR)));
    const crossDelta = origin - laneCrossMin;

    // Apply cross shift to lane nodes.
    if (Math.abs(crossDelta) > 0.001) {
      for (let i = 0; i < laneLayout.nodes.length; i++) {
        const n = laneNodeById.get(laneLayout.nodes[i].id) ?? laneLayout.nodes[i];
        const shifted = shiftCross(n, crossDelta, isLR);
        laneNodeById.set(n.id, shifted);
      }
      // Also shift internal edge waypoints.
      laneLayouts.set(lane, {
        nodes: laneLayout.nodes.map((n) => laneNodeById.get(n.id)!),
        edges: laneLayout.edges.map((e) => ({
          ...e,
          points: translateEdgePoints(e.points, isLR ? 0 : crossDelta, isLR ? crossDelta : 0),
        })),
      });
    }

    // Record this lane's placement for use as an obstacle by later (deeper) lanes.
    const updatedPositions = laneLayout.nodes.map((n) => laneNodeById.get(n.id) ?? n);
    const crossStart = Math.min(...updatedPositions.map((n) => crossOf(n, isLR)));
    const crossEnd = Math.max(
      ...updatedPositions.map((n) => crossOf(n, isLR) + crossSpanOf(n, isLR))
    );
    const mainStart = Math.min(...updatedPositions.map((n) => mainOf(n, isLR)));
    const mainEnd = Math.max(...updatedPositions.map((n) => mainOf(n, isLR) + mainSpanOf(n, isLR)));

    placedLanePlacements.push({ ownerId: lane.ownerId, crossStart, crossEnd, mainStart, mainEnd });
  }

  // ── 7. Merge nodes and edges ─────────────────────────────────────────────

  const finalNodes: DagPositionedNode[] = [
    ...[...spineById.values()],
    ...[...laneNodeById.values()].map((n) => ({ ...n, crossPinned: true as const })),
  ];

  // Spine edges (with any push-boundary clears applied above).
  const finalEdges: DagPositionedEdge[] = [...spineLayout.edges];

  // Lane-internal edges.
  for (const [, layout] of laneLayouts) {
    finalEdges.push(...layout.edges);
  }

  // Boundary edges: clear waypoints (they span a spine↔lane boundary).
  for (const e of boundaryEdges) {
    finalEdges.push({ ...e, points: [] });
  }

  // Restore input edge order (applyDagre contract: every input edge appears exactly once).
  const edgeOrder = new Map(edges.map((e, i) => [e.id, i]));
  finalEdges.sort((a, b) => (edgeOrder.get(a.id) ?? 0) - (edgeOrder.get(b.id) ?? 0));

  return { nodes: finalNodes, edges: finalEdges, lanePlacements: placedLanePlacements };
}
