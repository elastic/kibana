/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DagPositionedEdge, DagPositionedNode } from '@kbn/dag-layout';
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
  // Exclude failure and rejoin edges: lane nodes no longer participate in the
  // spine dagre run, so a fallback owner has exactly one spine successor and
  // must not be treated as a fork. Rejoin edges point lane→spine but are
  // tagged on the spine graph; including them would inflate the head count of
  // the join target.
  const spineEdges = graphEdges.filter((e) => !e.isFailure && !e.isRejoin);

  // Group out-edges by source, preserving declaration order.
  const outEdges = new Map<string, string[]>(); // source → targets in order
  for (const e of spineEdges) {
    if (!mutableNodes.has(e.source)) continue;
    if (!outEdges.has(e.source)) outEdges.set(e.source, []);
    outEdges.get(e.source)!.push(e.target);
  }

  // Process each fork in declaration order.
  for (const [, heads] of outEdges) {
    if (heads.length < 2) continue;

    const laneSets = buildLaneSets(heads, spineEdges);
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
 * Pack if/switch/parallel fork branches as per-step micro-compounds.
 *
 * After `enforceForkLaneOrder` packs branches using spine-only widths, this pass
 * re-packs each branch so its fallback hierarchy sits contiguously next to the
 * step that owns it, before the next branch starts. Scope: fork-children only —
 * top-level spine steps keep the current cascade layout.
 *
 * Algorithm: for each fork (source with > 1 out-edge), process branches in
 * declaration order. Branch 0 keeps its spine position. For branch N > 0:
 *   1. Shift all branch N spine nodes so the head starts at prevCompoundRight + nodeSep.
 *   2. Re-place branch N lane nodes with branch-local obstacles only.
 *   3. Compute branch N compound right edge (spine + lanes) → becomes prevCompoundRight.
 */
export const enforceForkBranchCompoundOrder = (
  nodes: readonly DagPositionedNode[],
  edges: readonly DagPositionedEdge[],
  transformed: {
    edges: readonly GraphEdge[];
    fallbackLanes: readonly FallbackLane[];
    foreachGroups: readonly ForeachGroup[];
  },
  direction: 'TB' | 'LR',
  nodeSep: number
): { nodes: DagPositionedNode[]; edges: DagPositionedEdge[] } => {
  const crossAxis: 'x' | 'y' = direction === 'TB' ? 'x' : 'y';
  const mainAxis: 'x' | 'y' = crossAxis === 'x' ? 'y' : 'x';
  const crossSpan: 'width' | 'height' = crossAxis === 'x' ? 'width' : 'height';
  const mainSpan: 'width' | 'height' = mainAxis === 'x' ? 'width' : 'height';

  const mutableNodes: MutableNodes = new Map(
    nodes.map((n) => [n.id, { x: n.x, y: n.y, width: n.width, height: n.height }])
  );

  // Container inner ids — needed to carry inner nodes when a container shifts.
  const containerInnerIds = new Map<string, Set<string>>();
  for (const group of transformed.foreachGroups) {
    containerInnerIds.set(
      group.id,
      new Set([
        ...group.innerNodes.map((n) => n.id),
        ...(group.bypassLaneNodes ?? []).map((n) => n.id),
      ])
    );
  }

  // Only process outer-graph lanes (graphId === undefined).
  const outerLanes = transformed.fallbackLanes.filter((l) => l.graphId === undefined);

  const spineEdges = transformed.edges.filter((e) => !e.isFailure && !e.isRejoin);

  // Group out-edges by source, preserving declaration order.
  const outEdges = new Map<string, string[]>();
  for (const e of spineEdges) {
    if (!mutableNodes.has(e.source)) continue;
    if (!outEdges.has(e.source)) outEdges.set(e.source, []);
    outEdges.get(e.source)!.push(e.target);
  }

  // Reachability BFS for exclusive branch membership computation.
  const adjList = new Map<string, string[]>();
  for (const e of spineEdges) {
    if (!adjList.has(e.source)) adjList.set(e.source, []);
    adjList.get(e.source)!.push(e.target);
  }
  const reachableFrom = (start: string): Set<string> => {
    const visited = new Set<string>();
    const queue: string[] = [start];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      for (const next of adjList.get(id) ?? []) {
        if (!visited.has(next)) queue.push(next);
      }
    }
    return visited;
  };

  // Shift a node (and its container inner nodes) along the cross axis by delta.
  const shiftNode = (id: string, delta: number): void => {
    const n = mutableNodes.get(id);
    if (!n) return;
    mutableNodes.set(id, {
      ...n,
      x: n.x + (crossAxis === 'x' ? delta : 0),
      y: n.y + (crossAxis === 'y' ? delta : 0),
    });
    for (const innerId of containerInnerIds.get(id) ?? []) {
      const inner = mutableNodes.get(innerId);
      if (inner) {
        mutableNodes.set(innerId, {
          ...inner,
          x: inner.x + (crossAxis === 'x' ? delta : 0),
          y: inner.y + (crossAxis === 'y' ? delta : 0),
        });
      }
    }
  };

  for (const [, heads] of outEdges) {
    if (heads.length < 2) continue;

    // Build exclusive branch node sets (same logic as buildLaneSets).
    const perHeadReachable = new Map(heads.map((h) => [h, reachableFrom(h)]));
    const branchSets = new Map<string, Set<string>>();
    for (const head of heads) {
      const mine = perHeadReachable.get(head)!;
      const exclusive = new Set<string>([head]);
      for (const id of mine) {
        let shared = false;
        for (const [otherHead, otherReachable] of perHeadReachable) {
          if (otherHead !== head && otherReachable.has(id)) {
            shared = true;
            break;
          }
        }
        if (!shared) exclusive.add(id);
      }
      branchSets.set(head, exclusive);
    }

    let prevBranchCrossEnd = -Infinity;

    for (let i = 0; i < heads.length; i++) {
      const head = heads[i];
      const branchSpineIds = branchSets.get(head)!;

      // 1. Shift branch spine nodes to start immediately after the previous branch compound.
      if (i > 0 && isFinite(prevBranchCrossEnd)) {
        const headNode = mutableNodes.get(head);
        if (headNode) {
          const delta = prevBranchCrossEnd + nodeSep - headNode[crossAxis];
          if (Math.abs(delta) >= 0.001) {
            for (const spineId of branchSpineIds) {
              shiftNode(spineId, delta);
            }
          }
        }
      }

      // 2. Collect lanes in this branch (BFS from spine node owners, then nested lane owners).
      const branchLaneIds = new Set<string>();
      const branchLanes: FallbackLane[] = [];
      let queue = outerLanes.filter((l) => branchSpineIds.has(l.owner));
      while (queue.length > 0) {
        const next: FallbackLane[] = [];
        for (const lane of queue) {
          if (branchLaneIds.has(lane.head)) continue; // already collected
          branchLanes.push(lane);
          for (const id of lane.nodes) branchLaneIds.add(id);
          for (const nested of outerLanes) {
            if (lane.nodes.includes(nested.owner) && !branchLaneIds.has(nested.head)) {
              next.push(nested);
            }
          }
        }
        queue = next;
      }

      // Sort shallowest-first, then by owner's main position.
      branchLanes.sort((a, b) => {
        if (a.depth !== b.depth) return a.depth - b.depth;
        const aOwner = mutableNodes.get(a.owner);
        const bOwner = mutableNodes.get(b.owner);
        return (aOwner?.[mainAxis] ?? 0) - (bOwner?.[mainAxis] ?? 0);
      });

      // Re-place lanes using branch-local obstacles only.
      type Rect = { crossStart: number; crossEnd: number; mainStart: number; mainEnd: number };
      const placedPlacements: Rect[] = [];

      for (const lane of branchLanes) {
        const lanePos = lane.nodes
          .map((id) => mutableNodes.get(id))
          .filter((n): n is NonNullable<ReturnType<MutableNodes['get']>> => n !== undefined);
        if (lanePos.length === 0) continue;

        const ownerNode = mutableNodes.get(lane.owner);
        const bandMainStart = ownerNode
          ? ownerNode[mainAxis]
          : Math.min(...lanePos.map((n) => n[mainAxis]));
        const bandMainEnd = Math.max(...lanePos.map((n) => n[mainAxis] + n[mainSpan]));

        // Branch-local spine obstacles: only spine nodes in this branch.
        const spineObstacles = [...branchSpineIds]
          .map((id) => mutableNodes.get(id))
          .filter((n): n is NonNullable<ReturnType<MutableNodes['get']>> => n !== undefined)
          .filter((n) => n[mainAxis] < bandMainEnd && bandMainStart < n[mainAxis] + n[mainSpan]);

        // Already-placed branch lane obstacles.
        const laneObstacles = placedPlacements.filter(
          (p) => p.mainStart < bandMainEnd && bandMainStart < p.mainEnd
        );

        const maxCrossEnd = Math.max(
          ...spineObstacles.map((n) => n[crossAxis] + n[crossSpan]),
          ...laneObstacles.map((p) => p.crossEnd),
          -Infinity
        );

        const origin = maxCrossEnd === -Infinity ? 0 : maxCrossEnd + nodeSep;
        const currentMin = Math.min(...lanePos.map((n) => n[crossAxis]));
        const delta = origin - currentMin;

        if (Math.abs(delta) >= 0.001) {
          for (const id of lane.nodes) shiftNode(id, delta);
        }

        const updatedPos = lane.nodes
          .map((id) => mutableNodes.get(id))
          .filter((n): n is NonNullable<ReturnType<MutableNodes['get']>> => n !== undefined);
        if (updatedPos.length > 0) {
          placedPlacements.push({
            crossStart: Math.min(...updatedPos.map((n) => n[crossAxis])),
            crossEnd: Math.max(...updatedPos.map((n) => n[crossAxis] + n[crossSpan])),
            mainStart: Math.min(...updatedPos.map((n) => n[mainAxis])),
            mainEnd: Math.max(...updatedPos.map((n) => n[mainAxis] + n[mainSpan])),
          });
        }
      }

      // 3. Compute branch compound cross extent (spine + lanes).
      let branchCrossEnd = -Infinity;
      for (const id of branchSpineIds) {
        const n = mutableNodes.get(id);
        if (n) {
          const end = n[crossAxis] + n[crossSpan];
          if (end > branchCrossEnd) branchCrossEnd = end;
        }
      }
      for (const id of branchLaneIds) {
        const n = mutableNodes.get(id);
        if (n) {
          const end = n[crossAxis] + n[crossSpan];
          if (end > branchCrossEnd) branchCrossEnd = end;
        }
      }

      if (isFinite(branchCrossEnd)) prevBranchCrossEnd = branchCrossEnd;
    }
  }

  const resultNodes = nodes.map((original) => {
    const updated = mutableNodes.get(original.id);
    if (!updated) return original;
    if (updated.x === original.x && updated.y === original.y) return original;
    return { ...original, x: updated.x, y: updated.y } as DagPositionedNode;
  });

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
