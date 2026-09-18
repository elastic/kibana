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
 * - Every lane head's main centre equals its owner's main centre (D3).
 * - The spine below every owner clears the lane's full main extent (D7).
 * - Every lane's inner (−cross) edge is ≥ nodeSep past the cross extent of all
 *   spine nodes sharing the lane's main band (D5 — local hugging).
 * - Deeper lanes are always further out than shallower lanes containing their
 *   owner (depth monotonicity within a chain).
 * - Lane nodes are tagged `crossPinned: true`.
 * - Boundary edges (exactly one endpoint in a lane) are returned with `points: []`.
 *
 * Handles an empty `lanes` array identically to `applyDagre`.
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
  // Fast path: nothing to do for an empty lane set.
  if (lanes.length === 0) {
    const { nodes: n, edges: e } = applyDagre(nodes, edges, direction, nodeSep, rankSep);
    return { nodes: n, edges: e, lanePlacements: [] };
  }

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

  const laneLayouts = new Map<DagReservedLane, { nodes: DagPositionedNode[]; edges: DagPositionedEdge[] }>();
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
  const spineById = new Map<string, DagPositionedNode>(
    spineLayout.nodes.map((n) => [n.id, n])
  );

  const laneNodeById = new Map<string, DagPositionedNode>();
  for (const [, layout] of laneLayouts) {
    for (const n of layout.nodes) laneNodeById.set(n.id, n);
  }

  // ── 4. Level heads (shallowest-first, top-down within each depth) ────────
  //
  // Sorted: depth ascending (0 first), then ownerMain ascending so a push
  // from an earlier owner's lane is applied before its successor's lane levels.
  // We level depth-0 lanes against spine owners; depth-1+ lanes against
  // already-levelled lane owners.

  const sortedLanes = [...lanes].sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    const aOwner = spineById.get(a.ownerId) ?? laneNodeById.get(a.ownerId);
    const bOwner = spineById.get(b.ownerId) ?? laneNodeById.get(b.ownerId);
    return (aOwner ? mainOf(aOwner, isLR) : 0) - (bOwner ? mainOf(bOwner, isLR) : 0);
  });

  for (const lane of sortedLanes) {
    const owner = spineById.get(lane.ownerId) ?? laneNodeById.get(lane.ownerId);
    if (!owner) continue;

    const laneLayout = laneLayouts.get(lane)!;
    if (laneLayout.nodes.length === 0) continue;

    // head = first lane node in dagre's main-axis order (minimum main centre).
    const head = laneLayout.nodes.reduce((min, n) =>
      mainOf(n, isLR) + mainSpanOf(n, isLR) / 2 < mainOf(min, isLR) + mainSpanOf(min, isLR) / 2
        ? n
        : min
    );

    const ownerMainCentre = mainOf(owner, isLR) + mainSpanOf(owner, isLR) / 2;
    const headMainCentre = mainOf(head, isLR) + mainSpanOf(head, isLR) / 2;
    const mainDelta = Math.round(ownerMainCentre - headMainCentre);

    if (mainDelta !== 0) {
      // Shift all lane nodes by mainDelta on the main axis.
      const updated = new Map<string, DagPositionedNode>();
      for (const n of laneLayout.nodes) {
        const shifted = shiftMain(n, mainDelta, isLR);
        updated.set(n.id, shifted);
        laneNodeById.set(n.id, shifted);
      }
      // Rebuild the layout with shifted nodes.
      laneLayouts.set(lane, {
        nodes: laneLayout.nodes.map((n) => updated.get(n.id) ?? n),
        edges: laneLayout.edges.map((e) => ({
          ...e,
          points: translateEdgePoints(
            e.points,
            isLR ? mainDelta : 0,
            isLR ? 0 : mainDelta
          ),
        })),
      });
    }
  }

  // ── 5. Spine push (depth-0 lanes only, top-down) ─────────────────────────
  //
  // For every lane whose owner IS a spine node, the spine below that owner must
  // clear the lane's full main extent. "Full main extent" = max main end of any
  // lane node (at any depth) whose main interval intersects the depth-0 band.

  const depth0Lanes = sortedLanes.filter((l) => l.depth === 0 && spineById.has(l.ownerId));

  for (const lane of depth0Lanes) {
    const owner = spineById.get(lane.ownerId)!;
    const ownerMainEnd = mainOf(owner, isLR) + mainSpanOf(owner, isLR);

    // The depth-0 lane's own main band (from owner main end, since head is levelled).
    const laneMainStart = mainOf(owner, isLR);
    // Max extent of ALL lane nodes at any depth whose main interval intersects.
    let laneMainEnd = ownerMainEnd;
    for (const [, n] of laneNodeById) {
      const nMain = mainOf(n, isLR);
      const nMainEnd = nMain + mainSpanOf(n, isLR);
      if (intervalsOverlap(laneMainStart, Infinity, nMain, nMainEnd)) {
        laneMainEnd = Math.max(laneMainEnd, nMainEnd);
      }
    }

    const required = laneMainEnd + rankSep;

    // Find the first spine node after the owner (main centre > owner main centre).
    const ownerMainCentre = mainOf(owner, isLR) + mainSpanOf(owner, isLR) / 2;
    const successors = [...spineById.values()]
      .filter((n) => mainOf(n, isLR) + mainSpanOf(n, isLR) / 2 > ownerMainCentre)
      .sort((a, b) => mainOf(a, isLR) - mainOf(b, isLR));

    if (successors.length === 0) continue; // owner is last spine node

    const firstSuccessor = successors[0];
    const successorMainStart = mainOf(firstSuccessor, isLR);
    const deficit = Math.max(0, required - successorMainStart);

    if (deficit > 0) {
      // Shift all spine nodes at or after successorMainStart.
      for (const n of [...spineById.values()]) {
        if (mainOf(n, isLR) >= successorMainStart - 0.001) {
          const shifted = shiftMain(n, deficit, isLR);
          spineById.set(n.id, shifted);
        }
      }
      // Translate spine edges across the push boundary.
      spineLayout.edges.forEach((e, i) => {
        // If target is in the pushed region, translate edge points.
        const targetNode = spineById.get(e.target);
        if (targetNode && mainOf(targetNode, isLR) >= successorMainStart - 0.001 + deficit) {
          // The target was pushed; translate waypoints.
          // Owner → successor is a straight line (both share a column), so clear it.
          const sourceNode = spineById.get(e.source);
          if (sourceNode && e.source === lane.ownerId) {
            spineLayout.edges[i] = { ...e, points: [] };
          } else if (sourceNode && mainOf(sourceNode, isLR) >= successorMainStart - 0.001 + deficit) {
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

  // ── 6. Compute cross origins (deepest-first, top-down within each depth) ──
  //
  // Placed lanes are accumulated as additional obstacles for later lanes.

  const deepestFirst = [...sortedLanes].reverse(); // already sorted by depth asc, so reverse
  const placedLanePlacements: DagReservedLanePlacement[] = [];

  // Sort deepest-first, then top-down within each depth.
  deepestFirst.sort((a, b) => {
    if (a.depth !== b.depth) return b.depth - a.depth; // deeper first
    const aOwner = spineById.get(a.ownerId) ?? laneNodeById.get(a.ownerId);
    const bOwner = spineById.get(b.ownerId) ?? laneNodeById.get(b.ownerId);
    return (aOwner ? mainOf(aOwner, isLR) : 0) - (bOwner ? mainOf(bOwner, isLR) : 0);
  });

  for (const lane of deepestFirst) {
    const laneLayout = laneLayouts.get(lane)!;
    if (laneLayout.nodes.length === 0) continue;

    const laneNodePositions = laneLayout.nodes.map((n) => laneNodeById.get(n.id) ?? n);

    // Lane's main band.
    const laneMainStart = Math.min(...laneNodePositions.map((n) => mainOf(n, isLR)));
    const laneMainEnd = Math.max(...laneNodePositions.map((n) => mainOf(n, isLR) + mainSpanOf(n, isLR)));

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
          points: translateEdgePoints(
            e.points,
            isLR ? 0 : crossDelta,
            isLR ? crossDelta : 0
          ),
        })),
      });
    }

    // Record this lane's placement for use as an obstacle by later (shallower) lanes.
    const updatedPositions = laneLayout.nodes.map((n) => laneNodeById.get(n.id) ?? n);
    const crossStart = Math.min(...updatedPositions.map((n) => crossOf(n, isLR)));
    const crossEnd = Math.max(...updatedPositions.map((n) => crossOf(n, isLR) + crossSpanOf(n, isLR)));
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
