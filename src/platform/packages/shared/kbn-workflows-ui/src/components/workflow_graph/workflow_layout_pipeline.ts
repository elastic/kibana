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
import { FORK_HEAD_MIN_GAP } from './compute_wire_insertion_controls';
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

  // Extra main-axis space added symmetrically to each fork node so the
  // fork-head + button fits between the chip and the branch card without
  // overlapping. Restored immediately after dagLayout. Zero when WORKFLOW_RANK_SEP
  // already provides enough room.
  const FORK_HEAD_RESERVE = Math.max(0, FORK_HEAD_MIN_GAP - WORKFLOW_RANK_SEP);
  // The reserve (31px) is doubled because we grow each fork node on both
  // ends (bottom and top) symmetrically to keep its centre unchanged.
  const FORK_HEAD_SIZE_DELTA = FORK_HEAD_RESERVE * 2;

  // Fork node ids — the keys of forkNodeToJoinId. These are the if/switch/parallel
  // gate nodes that need extra breathing room below them.
  const forkNodeIds = new Set(transformed.forkNodeToJoinId.keys());

  const inflatedHeight = (n: { id: string; style: { width: number; height: number } }) =>
    direction === 'TB'
      ? n.style.height + (forkNodeIds.has(n.id) ? FORK_HEAD_SIZE_DELTA : 0)
      : n.style.height;
  const inflatedWidth = (n: { id: string; style: { width: number; height: number } }) =>
    direction === 'LR'
      ? n.style.width + (forkNodeIds.has(n.id) ? FORK_HEAD_SIZE_DELTA : 0)
      : n.style.width;

  const dagNodes = [
    ...nodes.map((n) => ({
      id: n.id,
      width: inflatedWidth(n),
      height: inflatedHeight(n),
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
        width: inflatedWidth(n),
        height: inflatedHeight(n),
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

  // Restore fork nodes to their real card size. The inflation was symmetric
  // (added FORK_HEAD_RESERVE on each side) so we shift position by +reserve
  // and shrink size by 2×reserve, keeping the card centre fixed.
  const deflatedLaid =
    FORK_HEAD_RESERVE > 0 && forkNodeIds.size > 0
      ? {
          ...laid,
          nodes: laid.nodes.map((n) => {
            if (!forkNodeIds.has(n.id)) return n;
            if (direction === 'TB') {
              return {
                ...n,
                y: n.y + FORK_HEAD_RESERVE,
                height: n.height - FORK_HEAD_SIZE_DELTA,
              };
            }
            return {
              ...n,
              x: n.x + FORK_HEAD_RESERVE,
              width: n.width - FORK_HEAD_SIZE_DELTA,
            };
          }),
        }
      : laid;

  // Snapshot cross-axis centres immediately after dagLayout, before any
  // post-dagre pass moves nodes. reconcileEdgePoints uses this to translate-or-
  // clear edge waypoints after all position-mutating passes (Step 4).
  const crossAxis = direction === 'TB' ? 'x' : 'y';
  const initialCentres = new Map(
    deflatedLaid.nodes.map((n) => [
      n.id,
      crossAxis === 'x' ? n.x + n.width / 2 : n.y + n.height / 2,
    ])
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
    deflatedLaid.nodes,
    deflatedLaid.edges,
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
  const {
    nodes: compactedNodes,
    edges: compactedEdges,
    packedLaneHeads,
  } = enforceForkBranchCompoundOrder(
    orderedNodes,
    orderedEdges,
    transformed,
    direction,
    WORKFLOW_NODE_SEP,
    containerDescendants
  );

  // Post-dagre pass 1c: re-sync fallback lane nodes to follow their owner.
  // Passes 1 and 1b move spine ancestors by a fork-centering delta but skip
  // lane nodes (crossPinned). A lane node placed at owner_dagre_x + 350 stays
  // put while the owner shifts, breaking the stepped pattern. Fix: for every
  // fallback lane, compute how much its owner moved since dagLayout and apply
  // the residual to every lane node that did not independently move by the same
  // amount (guards against a node moved by both pass 1 and this pass).
  //
  // Skip any lane pass 1b already repositioned (`packedLaneHeads`): that pass
  // re-places a branch's whole fallback hierarchy — any depth, since its BFS
  // walks into nested (fallback-of-a-fallback) lanes too — against branch-local
  // obstacles, not by mirroring the owner's delta. For a nested lane, the owner
  // itself is a lane node pass 1b also repositioned independently, so its delta
  // since dagLayout need not match the nested lane's own delta; re-applying a
  // "residual" here re-derives a bogus correction that can drag the lane back
  // into a sibling branch's column (e.g. a fallback-of-a-fallback landing on
  // top of the `if`'s other branch).
  let syncedNodes = compactedNodes;
  if (transformed.fallbackLanes.length > 0) {
    const nodeById = new Map(compactedNodes.map((n) => [n.id, n]));
    const syncedMap = new Map<string, DagPositionedNode>();
    // Process outer lanes first (depth ascending) so inner-lane owners already
    // have their updated position in syncedMap when the inner lane is visited.
    const lanesByDepth = [...transformed.fallbackLanes]
      .filter((lane) => !packedLaneHeads.has(lane.head))
      .sort((a, b) => a.depth - b.depth);
    for (const lane of lanesByDepth) {
      const ownerNode = syncedMap.get(lane.owner) ?? nodeById.get(lane.owner);
      const ownerInitialCx = initialCentres.get(lane.owner);
      if (ownerNode && ownerInitialCx !== undefined) {
        const ownerCurrentCx =
          crossAxis === 'x'
            ? ownerNode.x + ownerNode.width / 2
            : ownerNode.y + ownerNode.height / 2;
        const ownerDelta = ownerCurrentCx - ownerInitialCx;
        if (Math.abs(ownerDelta) >= 0.001) {
          for (const laneNodeId of lane.nodes) {
            const laneNode = syncedMap.get(laneNodeId) ?? nodeById.get(laneNodeId);
            const laneInitialCx = initialCentres.get(laneNodeId);
            if (laneNode && laneInitialCx !== undefined) {
              const laneCurrentCx =
                crossAxis === 'x'
                  ? laneNode.x + laneNode.width / 2
                  : laneNode.y + laneNode.height / 2;
              const residual = ownerDelta - (laneCurrentCx - laneInitialCx);
              if (Math.abs(residual) >= 0.001) {
                syncedMap.set(
                  laneNodeId,
                  crossAxis === 'x'
                    ? { ...laneNode, x: laneNode.x + residual }
                    : { ...laneNode, y: laneNode.y + residual }
                );
              }
            }
          }
        }
      }
    }
    if (syncedMap.size > 0) {
      syncedNodes = compactedNodes.map((n) => syncedMap.get(n.id) ?? n);
    }
  }

  // Post-dagre pass 2: enforce trigger lane declaration order.
  const { nodes: triggeredNodes, edges: triggeredEdges } = enforceTriggerLaneOrder(
    syncedNodes,
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

  // Post-dagre pass 3b: re-centre join nodes over their branch exits.
  // enforceForkLaneOrder re-centres the fork source (if/switch/parallel gate)
  // over its branch head positions, but the join node — which sits below the
  // branch exits and is shared by all of them — is not in any exclusive lane
  // set and is therefore not moved. After the lane-order swap the join node's
  // dagre-computed position is stale; fix it here so the merge-bus convergence
  // point and any terminal stub land at the visual centre.
  if (transformed.forkNodeToJoinId.size > 0) {
    const nodePositions = new Map(repairedNodes.map((n) => [n.id, n]));
    // Build predecessor map from all edges: outer edges and inner (foreach group) edges,
    // so that join nodes for forks inside containers are also re-centred.
    const predecessors = new Map<string, string[]>();
    const allEdgesForJoin = [
      ...transformed.edges,
      ...transformed.foreachGroups.flatMap((g) => g.innerEdges),
    ];
    for (const e of allEdgesForJoin) {
      const existing = predecessors.get(e.target);
      if (existing) {
        existing.push(e.source);
      } else {
        predecessors.set(e.target, [e.source]);
      }
    }
    const updatedPositions = new Map<string, { x: number; y: number }>();
    for (const [, joinId] of transformed.forkNodeToJoinId) {
      const joinNode = nodePositions.get(joinId);
      if (joinNode) {
        const preds = predecessors.get(joinId) ?? [];
        const predCenters = preds.flatMap((pid) => {
          const n = nodePositions.get(pid);
          return n ? [n.x + n.width / 2] : [];
        });
        if (predCenters.length > 0) {
          const midpoint = (Math.min(...predCenters) + Math.max(...predCenters)) / 2;
          const newX = midpoint - joinNode.width / 2;
          if (Math.abs(newX - joinNode.x) >= 0.001) {
            updatedPositions.set(joinId, { x: newX, y: joinNode.y });
          }
        }
      }
    }
    if (updatedPositions.size > 0) {
      // Build a successors map so we can propagate join moves to straight-chain
      // downstream nodes (nodes with exactly one predecessor in the same graph).
      // This prevents wire elbows when a join node is re-centred but its sole
      // successor (e.g. a while-group) keeps its original dagre position.
      const successors = new Map<string, string[]>();
      for (const e of allEdgesForJoin) {
        const existing = successors.get(e.source);
        if (existing) {
          existing.push(e.target);
        } else {
          successors.set(e.source, [e.target]);
        }
      }
      // Collect deltas for every node moved (joins first, then propagated nodes).
      const movedDeltas = new Map<string, number>();
      for (const [joinId, { x: newX }] of updatedPositions) {
        const joinNode = nodePositions.get(joinId);
        if (joinNode) {
          movedDeltas.set(joinId, newX - joinNode.x);
        }
      }
      // BFS: propagate each join's delta to its straight-chain successors.
      const propagateQueue = [...movedDeltas.keys()];
      while (propagateQueue.length > 0) {
        const nodeId = propagateQueue.shift();
        const delta = nodeId !== undefined ? movedDeltas.get(nodeId) : undefined;
        if (nodeId === undefined || delta === undefined) {
          break;
        }
        for (const succId of successors.get(nodeId) ?? []) {
          const succPreds = predecessors.get(succId) ?? [];
          if (succPreds.length === 1 && !updatedPositions.has(succId)) {
            const succNode = nodePositions.get(succId);
            if (succNode) {
              updatedPositions.set(succId, { x: succNode.x + delta, y: succNode.y });
              movedDeltas.set(succId, delta);
              propagateQueue.push(succId);
            }
          }
        }
      }
      for (let i = 0; i < repairedNodes.length; i++) {
        const updated = updatedPositions.get(repairedNodes[i].id);
        if (updated) {
          repairedNodes[i] = { ...repairedNodes[i], ...updated };
        }
      }
    }
  }

  // Post-dagre pass 4: refit foreach containers to their actual post-pass content.
  // Passes 1 and 1b re-centre inner forks and propagate the delta upward through
  // ancestors. The container size was frozen by layoutCompoundGroup before those
  // passes ran, so the inner content can drift outside (or be edge-clamped by
  // React Flow's extent:'parent') if the shift is large. Re-measure the actual
  // cross-axis bbox of every inner node (including bypass/join nodes) and update
  // the container's origin and cross size so the content sits centred with proper
  // padding. Height is left unchanged — passes 1–3 only move nodes on the cross axis.
  if (crossAxis === 'x' && transformed.foreachGroups.length > 0) {
    const nodePositionsById = new Map(repairedNodes.map((n) => [n.id, n]));
    const leftPad = WORKFLOW_COMPOUND_PADDING.left;
    const rightPad = WORKFLOW_COMPOUND_PADDING.right;
    for (const g of transformed.foreachGroups) {
      const allInnerIds = [...g.innerNodes.map((n) => n.id), ...g.bypassLaneNodes.map((n) => n.id)];
      const innerPositioned = allInnerIds
        .map((id) => nodePositionsById.get(id))
        .filter((n): n is DagPositionedNode => n !== undefined);
      const groupNode = nodePositionsById.get(g.id);
      if (innerPositioned.length > 0 && groupNode) {
        const contentMinX = Math.min(...innerPositioned.map((n) => n.x));
        const contentMaxX = Math.max(...innerPositioned.map((n) => n.x + n.width));
        const contentWidth = contentMaxX - contentMinX;
        // Keep the group's dagre-computed center fixed; only widen if content overflows.
        // Shifting the group itself would break outer-graph centering (e.g. under triggers).
        const groupCenterX = groupNode.x + groupNode.width / 2;
        const availableWidth = groupNode.width - leftPad - rightPad;
        const newGroupWidth =
          contentWidth > availableWidth ? contentWidth + leftPad + rightPad : groupNode.width;
        const newGroupX = groupCenterX - newGroupWidth / 2;
        // Translate inner nodes so their content sits centred with left/right padding.
        const desiredContentMinX =
          newGroupX + leftPad + (newGroupWidth - contentWidth - leftPad - rightPad) / 2;
        const innerDelta = desiredContentMinX - contentMinX;
        if (Math.abs(innerDelta) > 0.001) {
          for (const inner of innerPositioned) {
            const updated = { ...inner, x: inner.x + innerDelta };
            nodePositionsById.set(inner.id, updated);
            const idx = repairedNodes.findIndex((n) => n.id === inner.id);
            if (idx >= 0) repairedNodes[idx] = updated;
          }
        }
        if (
          Math.abs(newGroupX - groupNode.x) > 0.001 ||
          Math.abs(newGroupWidth - groupNode.width) > 0.001
        ) {
          const updatedGroup = { ...groupNode, x: newGroupX, width: newGroupWidth };
          nodePositionsById.set(g.id, updatedGroup);
          const groupIdx = repairedNodes.findIndex((n) => n.id === g.id);
          if (groupIdx >= 0) repairedNodes[groupIdx] = updatedGroup;
        }
      }
    }
  }

  // Post-dagre pass 4.5: final overlap repair (TB only).
  // Passes 3b (join re-centre) and 4 (container refit) move nodes on the cross
  // axis without a collision check. A second separation pass fixes any overlaps
  // they introduce. Skipped for LR: pass 4 refits containers on the cross (y)
  // axis only in TB, so the LR baseline is not regressed by this pass.
  if (crossAxis === 'x') {
    separatePositionedOverlapsInPlace(
      repairedNodes,
      crossAxis,
      WORKFLOW_NODE_SEP,
      containerMembers,
      containerDescendants
    );
  }

  // Post-dagre pass 5: reconcile edge waypoints.
  // Translate-or-clear based on how much each endpoint moved since dagLayout.
  // NOTE: dagLayout now moves spine nodes on the main axis (spine push for
  // reserved lanes — see ADR-0012). That push happens INSIDE dagLayout, before
  // the snapshot, so the snapshot already captures post-push positions and this
  // pass compares cross-axis deltas only, as before.
  const finalEdges = reconcileEdgePoints(triggeredEdges, repairedNodes, initialCentres, crossAxis);

  return { nodes: repairedNodes, edges: finalEdges };
};
