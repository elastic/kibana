/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { graphlib } from '@dagrejs/dagre';

export type CrossAxis = 'x' | 'y';

interface DagreLayoutNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AlignHelpers {
  g: graphlib.Graph;
  cross: (id: string) => number;
  crossSpan: (id: string) => number;
  setCross: (id: string, value: number) => void;
  prevCross: Record<string, number>;
  nodeSep: number;
  ignoredEdgeIds: ReadonlySet<string>;
}

const getNode = (g: graphlib.Graph, id: string): DagreLayoutNode => g.node(id) as DagreLayoutNode;

const getFilteredSuccessors = (
  g: graphlib.Graph,
  node: string,
  ignoredEdgeIds: ReadonlySet<string>
): string[] =>
  (g.successors(node) ?? [])
    .map((s) => s.toString())
    .filter((s) => {
      if (ignoredEdgeIds.size === 0) return true;
      const edgeLabel = (g.edge(node, s) as { label?: string } | undefined)?.label;
      return edgeLabel === undefined || !ignoredEdgeIds.has(edgeLabel);
    });

const getFilteredPredecessors = (
  g: graphlib.Graph,
  node: string,
  ignoredEdgeIds: ReadonlySet<string>
): string[] =>
  (g.predecessors(node) ?? [])
    .map((p) => p.toString())
    .filter((p) => {
      if (ignoredEdgeIds.size === 0) return true;
      const edgeLabel = (g.edge(p, node) as { label?: string } | undefined)?.label;
      return edgeLabel === undefined || !ignoredEdgeIds.has(edgeLabel);
    });

const roundCross = (value: number): number => Math.round(value);

const calculateCenterCross = (nodeIds: string[], cross: (id: string) => number): number => {
  if (nodeIds.length === 0) return 0;
  const first = nodeIds.reduce(
    (min, nodeId) => (cross(nodeId) < cross(min) ? nodeId : min),
    nodeIds[0]
  );
  const last = nodeIds.reduce(
    (max, nodeId) => (cross(nodeId) > cross(max) ? nodeId : max),
    nodeIds[0]
  );
  return cross(first) + (cross(last) - cross(first)) / 2;
};

const findSiblingsWithSharedChildren = (
  helpers: AlignHelpers,
  currNode: string,
  children: string[],
  parents: string[]
): string[] => {
  const { g, ignoredEdgeIds } = helpers;
  const siblingsWithSharedChildren: string[] = [];

  for (const parent of parents) {
    const allSiblings = getFilteredSuccessors(g, parent, ignoredEdgeIds);
    for (const sibling of allSiblings) {
      if (!siblingsWithSharedChildren.includes(sibling)) {
        const siblingChildren = getFilteredSuccessors(g, sibling, ignoredEdgeIds);
        if (children.some((child) => siblingChildren.includes(child))) {
          siblingsWithSharedChildren.push(sibling);
        }
      }
    }
  }

  return siblingsWithSharedChildren;
};

function analyzeSiblings(
  siblings: string[],
  prevCross: Record<string, number>,
  cross: (id: string) => number,
  crossSpan: (id: string) => number
) {
  // Both sides of each comparison must use the same coordinate space.
  // `prevCross[id]` holds the pre-shift position when a node was moved earlier
  // in the reverse-topo pass; `cross(id)` is the live (possibly already-shifted)
  // position. Using `prevCross ?? cross` consistently on both candidate and
  // accumulator prevents the wrong first/last sibling being selected when the
  // accumulator was shifted in a prior iteration.
  const firstSibling = siblings.reduce(
    (min, siblingNode) =>
      (prevCross[siblingNode] ?? cross(siblingNode)) < (prevCross[min] ?? cross(min))
        ? siblingNode
        : min,
    siblings[0]
  );
  const lastSibling = siblings.reduce(
    (max, siblingNode) =>
      (prevCross[siblingNode] ?? cross(siblingNode)) > (prevCross[max] ?? cross(max))
        ? siblingNode
        : max,
    siblings[0]
  );

  const firstSiblingInfo = {
    id: firstSibling,
    span: crossSpan(firstSibling),
    top: (prevCross[firstSibling] ?? cross(firstSibling)) - crossSpan(firstSibling) / 2,
    middle: prevCross[firstSibling] ?? cross(firstSibling),
  };
  const lastSiblingInfo = {
    id: lastSibling,
    span: crossSpan(lastSibling),
    top: (prevCross[lastSibling] ?? cross(lastSibling)) - crossSpan(lastSibling) / 2,
    middle: prevCross[lastSibling] ?? cross(lastSibling),
  };
  return { lastSiblingInfo, firstSiblingInfo };
}

const handleMultipleChildren = (
  helpers: AlignHelpers,
  currNode: string,
  children: string[]
): void => {
  const { g, cross, crossSpan, setCross, prevCross, nodeSep, ignoredEdgeIds } = helpers;
  const currCross = cross(currNode);
  const parents = getFilteredPredecessors(g, currNode, ignoredEdgeIds);
  const siblingsWithSharedChildren = findSiblingsWithSharedChildren(
    helpers,
    currNode,
    children,
    parents
  );

  if (siblingsWithSharedChildren.length > 1) {
    const allChildrenSet = new Set<string>();
    for (const sibling of siblingsWithSharedChildren) {
      getFilteredSuccessors(g, sibling, ignoredEdgeIds).forEach((child) => allChildrenSet.add(child));
    }
    const allChildren = Array.from(allChildrenSet);
    const commonCenter = calculateCenterCross(allChildren, cross);
    const siblingIndex = siblingsWithSharedChildren.indexOf(currNode);
    const siblingCount = siblingsWithSharedChildren.length;
    const spacing = crossSpan(currNode) + nodeSep;
    const totalSpan = (siblingCount - 1) * spacing;
    const newCross = commonCenter - totalSpan / 2 + siblingIndex * spacing;

    prevCross[currNode] = currCross;
    setCross(currNode, roundCross(newCross));
  } else {
    const centerCross = calculateCenterCross(children, cross);
    prevCross[currNode] = currCross;
    setCross(currNode, roundCross(centerCross));
  }
};

const handleSingleChild = (helpers: AlignHelpers, currNode: string, child: string): void => {
  const { g, cross, crossSpan, setCross, prevCross, ignoredEdgeIds } = helpers;
  const currCross = cross(currNode);
  const siblings = getFilteredPredecessors(g, child, ignoredEdgeIds);

  if (siblings.length > 1) {
    const { lastSiblingInfo, firstSiblingInfo } = analyzeSiblings(
      siblings,
      prevCross,
      cross,
      crossSpan
    );
    const edgesSpan = lastSiblingInfo.middle - firstSiblingInfo.middle;
    const finalChildCross = cross(child) - crossSpan(child) / 2;
    const firstSiblingNewCross = finalChildCross - (edgesSpan - crossSpan(child)) / 2;
    const finalFirstSiblingNewCross = firstSiblingNewCross - firstSiblingInfo.span / 2;
    const newCross = roundCross(finalFirstSiblingNewCross) + currCross - firstSiblingInfo.top;

    prevCross[currNode] = currCross;
    setCross(currNode, newCross);
  } else if (prevCross[child] !== undefined) {
    const newCross = currCross - (prevCross[child] - cross(child));
    prevCross[currNode] = currCross;
    setCross(currNode, newCross);
  } else {
    // Child has exactly one alignment parent (me) and was not moved during its
    // own processing — handleSingleParent left prevCross[child] unset so that
    // we land here. Align me directly to the child's dagre column. This is the
    // correct direction: the parent centres over its only child, not the reverse.
    prevCross[currNode] = currCross;
    setCross(currNode, roundCross(cross(child)));
  }
};

const handleMultipleParents = (
  helpers: AlignHelpers,
  currNode: string,
  parents: string[]
): void => {
  const { g, cross, crossSpan, setCross, prevCross, ignoredEdgeIds } = helpers;
  const currCross = cross(currNode);
  const hasSiblings = parents.some(
    (parent) => getFilteredSuccessors(g, parent, ignoredEdgeIds).length > 1
  );

  if (hasSiblings) {
    prevCross[currNode] = currCross;
  } else {
    const { firstSiblingInfo: firstParentInfo, lastSiblingInfo: lastParentInfo } = analyzeSiblings(
      parents,
      prevCross,
      cross,
      crossSpan
    );
    const edgesSpan = lastParentInfo.middle - firstParentInfo.middle;
    const newCross = firstParentInfo.middle + (edgesSpan - crossSpan(currNode)) / 2;

    prevCross[currNode] = currCross;
    setCross(currNode, roundCross(newCross));
  }
};

const handleSingleParent = (helpers: AlignHelpers, currNode: string, parent: string): void => {
  const { g, cross, prevCross, ignoredEdgeIds } = helpers;
  const currCross = cross(currNode);
  const siblings = getFilteredSuccessors(g, parent, ignoredEdgeIds);

  if (siblings.length > 1) {
    prevCross[currNode] = currCross;
  }
  // When siblings.length === 1 (I am the parent's only alignment child), the
  // barycenter rule says the parent should centre over me — not the other way
  // around. Leave this node untouched and do NOT record prevCross: the undefined
  // prevCross triggers the direct-align else-branch in handleSingleChild when
  // the parent is processed next, pulling it to my column. For symmetric chains
  // where dagre already aligns parent and child, both behaviours are no-ops.
};

const handleNoChildren = (helpers: AlignHelpers, currNode: string): void => {
  const { g, cross, setCross, prevCross, ignoredEdgeIds } = helpers;
  const currCross = cross(currNode);
  const parents = getFilteredPredecessors(g, currNode, ignoredEdgeIds);

  if (parents.length > 1) {
    handleMultipleParents(helpers, currNode, parents);
  } else if (parents.length === 1) {
    handleSingleParent(helpers, currNode, parents[0]);
  } else {
    prevCross[currNode] = currCross;
    setCross(currNode, roundCross(currCross));
  }
};

const topsort = (g: graphlib.Graph): string[] => {
  const visited: Record<string, boolean> = {};
  const stack: Record<string, boolean> = {};
  const results: string[] = [];

  const visit = (node: string): void => {
    if (Object.hasOwn(stack, node)) {
      throw new Error('CycleException');
    }
    if (!Object.hasOwn(visited, node)) {
      stack[node] = true;
      visited[node] = true;
      g.predecessors(node)?.forEach((preNode) => visit(preNode.toString()));
      delete stack[node];
      results.push(node);
    }
  };

  g.sinks().forEach((node) => visit(node.toString()));
  return results;
};

/**
 * Re-centre a Dagre-laid-out graph on the rank cross-axis so parents sit at the
 * barycenter of their children (and merge nodes at the barycenter of parents).
 * TB layouts pass crossAxis `'x'`; LR layouts pass `'y'`.
 *
 * `ignoredEdgeIds` — edge ids excluded from alignment decisions. Edges in this
 * set still participate in dagre's ranking and routing; only the barycenter pass
 * ignores them. Use this to prevent an asymmetric fork (e.g., a failure lane)
 * from pulling the main spine off-axis. Defaults to an empty set (no effect).
 */
export const alignDagreCrossAxisInPlace = (
  g: graphlib.Graph,
  crossAxis: CrossAxis,
  nodeSep: number,
  ignoredEdgeIds: ReadonlySet<string> = new Set()
): void => {
  const helpers: AlignHelpers = {
    g,
    nodeSep,
    ignoredEdgeIds,
    prevCross: {},
    cross: (id) => (crossAxis === 'x' ? getNode(g, id).x : getNode(g, id).y),
    crossSpan: (id) => (crossAxis === 'x' ? getNode(g, id).width : getNode(g, id).height),
    setCross: (id, value) => {
      const node = getNode(g, id);
      if (crossAxis === 'x') {
        node.x = value;
      } else {
        node.y = value;
      }
    },
  };

  const topo = topsort(g);
  for (const currNode of topo.reverse()) {
    const children = getFilteredSuccessors(g, currNode, ignoredEdgeIds);
    if (children.length > 1) {
      handleMultipleChildren(helpers, currNode, children);
    } else if (children.length === 1) {
      handleSingleChild(helpers, currNode, children[0]);
    } else {
      handleNoChildren(helpers, currNode);
    }
  }
};

interface PavaBlock {
  sum: number;
  count: number;
  value: number;
  /** If set, this block is pinned: its value is fixed and free neighbours clamp against it. */
  pinnedValue?: number;
}

/** Private sentinel thrown when two pinned blocks merge — triggers a pin-relaxation retry. */
const PIN_CONFLICT = Symbol('PIN_CONFLICT');

/**
 * Resolve overlaps among a set of same-rank node centers on the cross axis,
 * preserving their left-to-right order.
 *
 * A rank is only adjusted when two neighbours actually overlap (center distance
 * < `(widthA + widthB) / 2`), so ranks that are merely tighter than the desired
 * separation are left untouched. When a rank does overlap, it is spread to a
 * minimum center-to-center gap of `(widthA + widthB) / 2 + nodeSep` between
 * neighbours using the minimal-total-displacement solution (isotonic regression
 * / pool-adjacent-violators), so pooled violators keep their average position and
 * the arrangement expands symmetrically around its own centre of mass rather than
 * drifting to one side.
 *
 * When `pinned` is provided, pinned indices are treated as immovable (infinite
 * weight): free nodes between two pins pack tight against their nearest pin;
 * free runs at either end pack tight against the single bounding pin. This
 * minimises `Σ_{i free} (x_i − c_i)²` subject to both gap constraints and
 * pin constraints.
 *
 * The "spreads symmetrically" property applies only to pin-free runs; near a pin
 * the free nodes are asymmetrically offset toward the pin, which is the intended
 * behaviour.
 *
 * @param centers Current cross-axis centers, sorted ascending.
 * @param widths Cross-axis extent of each node (index-aligned with `centers`).
 * @param nodeSep Desired gap between node borders once an overlap is resolved.
 * @param pinned Optional array of booleans (index-aligned). `true` = immovable.
 * @returns New centers, or the original `centers` reference when nothing overlaps.
 */
const resolveCrossAxisOverlaps = (
  centers: number[],
  widths: number[],
  nodeSep: number,
  pinned?: readonly boolean[]
): number[] => {
  const n = centers.length;
  if (n < 2) return centers;

  const overlapGap = (i: number): number => (widths[i] + widths[i + 1]) / 2;
  const targetGap = (i: number): number => overlapGap(i) + nodeSep;

  let overlaps = false;
  for (let i = 0; i < n - 1; i++) {
    if (centers[i + 1] - centers[i] < overlapGap(i) - 1e-6) {
      overlaps = true;
      break;
    }
  }
  if (!overlaps) return centers;

  // Shift into a space where the min-gap constraints become "non-decreasing":
  // x_i = c_i - sum_{k<i} targetGap(k). Solving isotonic regression on x and
  // shifting back yields the minimal-movement feasible arrangement.
  const prefix = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) prefix[i] = prefix[i - 1] + targetGap(i - 1);
  const shifted = centers.map((c, i) => c - prefix[i]);

  // Build the active pin set. If a pair of pins conflict (infeasible gap),
  // demote the later one and retry — at most n retries, each O(n).
  const activePins = new Set(pinned ? pinned.map((p, i) => (p ? i : -1)).filter((i) => i >= 0) : []);

  const runPava = (): number[] | typeof PIN_CONFLICT => {
    const blocks: PavaBlock[] = [];
    for (let i = 0; i < n; i++) {
      const value = shifted[i];
      const isPinned = activePins.has(i);
      let current: PavaBlock = isPinned
        ? { sum: value, count: 1, value, pinnedValue: value }
        : { sum: value, count: 1, value };

      while (blocks.length > 0 && blocks[blocks.length - 1].value > current.value) {
        const prev = blocks.pop()!;
        if (prev.pinnedValue !== undefined && current.pinnedValue !== undefined) {
          // Two pinned blocks must merge but cannot — infeasible.
          return PIN_CONFLICT;
        }
        const pinnedValue = prev.pinnedValue ?? current.pinnedValue;
        const sum = prev.sum + current.sum;
        const count = prev.count + current.count;
        current = { sum, count, value: pinnedValue ?? sum / count, pinnedValue };
      }
      blocks.push(current);
    }

    const resolved = new Array<number>(n);
    let idx = 0;
    for (const block of blocks) {
      for (let k = 0; k < block.count; k++) {
        resolved[idx] = block.value + prefix[idx];
        idx++;
      }
    }
    return resolved;
  };

  // Retry with demoted pins if two pinned blocks conflict.
  let result = runPava();
  const demotedPins: number[] = [];
  while (result === PIN_CONFLICT && activePins.size > 0) {
    // Demote the most recently added pin (highest index in the conflict).
    const lastPin = Math.max(...activePins);
    activePins.delete(lastPin);
    demotedPins.push(lastPin);
    result = runPava();
  }
  // `result` is always a valid number[] once all conflicting pins are demoted.
  return result as number[];
};

/**
 * Restore dagre's non-overlap guarantee after the barycenter pass and after any
 * post-dagre cross-axis passes. The barycenter recentring only edits the cross
 * axis and can pull a wide subtree's head across
 * its rank until it overlaps a sibling; it never changes the main-axis (rank)
 * coordinate, so grouping by main-axis centre and separating within each rank on
 * the cross axis is sufficient. No-op when nothing overlaps.
 */
export const separateRankOverlapsInPlace = (
  g: graphlib.Graph,
  crossAxis: CrossAxis,
  nodeSep: number
): void => {
  const cross = (id: string): number => (crossAxis === 'x' ? getNode(g, id).x : getNode(g, id).y);
  const main = (id: string): number => (crossAxis === 'x' ? getNode(g, id).y : getNode(g, id).x);
  const crossSpan = (id: string): number =>
    crossAxis === 'x' ? getNode(g, id).width : getNode(g, id).height;
  const setCross = (id: string, value: number): void => {
    const node = getNode(g, id);
    if (crossAxis === 'x') {
      node.x = value;
    } else {
      node.y = value;
    }
  };

  const ranks = new Map<number, string[]>();
  for (const nodeId of g.nodes()) {
    if (!g.node(nodeId)) continue;
    const rankKey = Math.round(main(nodeId));
    const bucket = ranks.get(rankKey);
    if (bucket) {
      bucket.push(nodeId);
    } else {
      ranks.set(rankKey, [nodeId]);
    }
  }

  for (const rankIds of ranks.values()) {
    if (rankIds.length < 2) continue;
    rankIds.sort((a, b) => cross(a) - cross(b));
    const centers = rankIds.map(cross);
    const widths = rankIds.map(crossSpan);
    const resolved = resolveCrossAxisOverlaps(centers, widths, nodeSep);
    if (resolved === centers) continue;
    for (let i = 0; i < rankIds.length; i++) {
      setCross(rankIds[i], roundCross(resolved[i]));
    }
  }
};

export const snapshotDagreNodeCenters = (
  g: graphlib.Graph,
  nodeIds: string[]
): Map<string, { x: number; y: number }> => {
  const snapshot = new Map<string, { x: number; y: number }>();
  for (const id of nodeIds) {
    const node = getNode(g, id);
    snapshot.set(id, { x: node.x, y: node.y });
  }
  return snapshot;
};

export const shiftEdgePointsOnCrossAxis = (
  points: Array<{ x: number; y: number }>,
  crossAxis: CrossAxis,
  delta: number
): Array<{ x: number; y: number }> =>
  points.map((p) => (crossAxis === 'x' ? { x: p.x + delta, y: p.y } : { x: p.x, y: p.y + delta }));

export interface ShiftEdgePointsInterpolatedParams {
  points: Array<{ x: number; y: number }>;
  crossAxis: CrossAxis;
  mainAxis: CrossAxis;
  sourceMain: number;
  targetMain: number;
  sourceDelta: number;
  targetDelta: number;
}

/**
 * Shifts each waypoint's cross-axis coordinate by an amount interpolated between
 * sourceDelta and targetDelta along the edge's main axis (Y for TB, X for LR).
 */
export const shiftEdgePointsInterpolated = ({
  points,
  crossAxis,
  mainAxis,
  sourceMain,
  targetMain,
  sourceDelta,
  targetDelta,
}: ShiftEdgePointsInterpolatedParams): Array<{ x: number; y: number }> => {
  const mainSpan = targetMain - sourceMain;
  return points.map((p) => {
    const mainCoord = mainAxis === 'x' ? p.x : p.y;
    const t =
      Math.abs(mainSpan) < 0.001
        ? 0.5
        : Math.max(0, Math.min(1, (mainCoord - sourceMain) / mainSpan));
    const delta = sourceDelta + t * (targetDelta - sourceDelta);
    return crossAxis === 'x' ? { x: p.x + delta, y: p.y } : { x: p.x, y: p.y + delta };
  });
};

export const translateEdgePoints = (
  points: ReadonlyArray<{ x: number; y: number }>,
  dx: number,
  dy: number
): Array<{ x: number; y: number }> => points.map((p) => ({ x: p.x + dx, y: p.y + dy }));

import type { DagPositionedNode } from './types';

const SEPARATE_OVERLAPS_MAX_ITERS = 10;

/**
 * Separate overlapping boxes in a positioned node array using a scanline PAVA
 * (pool-adjacent-violators) sweep. Operates on `DagPositionedNode[]` rather
 * than a graphlib graph, so it can be called after every position-mutating
 * post-dagre pass.
 *
 * Algorithm:
 * - At each distinct main-axis start, collect all boxes straddling that
 *   scanline. They form a clique of mutual main-axis overlap.
 * - Sort the clique by cross axis and run PAVA (`resolveCrossAxisOverlaps`).
 * - Because PAVA is order-preserving it cannot undo a lane-order enforcement
 *   that ran before this pass.
 * - Iterate to stability (capped at SEPARATE_OVERLAPS_MAX_ITERS).
 * - When a group node moves, translate all its inner nodes by the same delta.
 *
 * Pure and re-runnable: on input that is already overlap-free the sweep fires
 * on 0 nodes and returns immediately. Running it on raw `dagLayout` output is
 * a verified no-op.
 *
 * @param nodes - All positioned nodes (outer + inner). Mutated in place by
 *   replacing array elements when positions change.
 * @param crossAxis - Cross axis ('x' for TB, 'y' for LR).
 * @param nodeSep - Minimum gap between adjacent box borders.
 * @param groupInnerIds - Map from group node id → set of inner node ids.
 *   The outer sweep treats group nodes as opaque boxes and moves inner nodes
 *   when the group moves. The inner sweep then resolves overlaps within each
 *   group body independently. Pass an empty map when there are no groups.
 */
/**
 * @returns `{ relaxedPinIds }` — node ids whose `crossPinned` flag was demoted
 *   during infeasibility relaxation. Empty when all pins held. Callers that
 *   assert `relaxedPinIds.length === 0` catch infeasibility early rather than
 *   discovering it as a visual anomaly.
 */
export const separatePositionedOverlapsInPlace = (
  nodes: DagPositionedNode[],
  crossAxis: CrossAxis,
  nodeSep: number,
  groupInnerIds: ReadonlyMap<string, ReadonlySet<string>> = new Map()
): { relaxedPinIds: string[] } => {
  if (nodes.length < 2) return { relaxedPinIds: [] };
  // Build index: node id → array index.
  const idxById = new Map(nodes.map((n, i) => [n.id, i]));

  // Mutable position store (cross axis only; main axis never changes here).
  const crossPos = new Map<string, number>(
    nodes.map((n) => [n.id, crossAxis === 'x' ? n.x : n.y])
  );

  // Cross-axis accessors operating on the mutable store.
  const crossOf = (id: string) => crossPos.get(id) ?? 0;
  const setCross = (id: string, value: number) => crossPos.set(id, value);

  // Main-axis accessors use original node values (main axis never changes).
  const mainOf = (id: string) => {
    const n = nodes[idxById.get(id)!];
    return crossAxis === 'x' ? n.y : n.x;
  };
  const mainSpanOf = (id: string) => {
    const n = nodes[idxById.get(id)!];
    return crossAxis === 'x' ? n.height : n.width;
  };
  const crossSpanOf = (id: string) => {
    const n = nodes[idxById.get(id)!];
    return crossAxis === 'x' ? n.width : n.height;
  };

  // Determine which nodes are outer (not inner to any group at this level).
  const innerNodeIdSet = new Set<string>();
  for (const innerIds of groupInnerIds.values()) {
    for (const id of innerIds) innerNodeIdSet.add(id);
  }
  const outerNodeIds = nodes.map((n) => n.id).filter((id) => !innerNodeIdSet.has(id));

  // Collect per-group inner id lists (only those present in the node array).
  const groupInnerLists = new Map<string, string[]>();
  for (const [gid, innerIds] of groupInnerIds) {
    const present = [...innerIds].filter((id) => idxById.has(id));
    if (present.length > 0) groupInnerLists.set(gid, present);
  }

  // Track pins that were demoted due to infeasibility (relaxedPinIds collected here).
  const relaxedPinNodeIds: string[] = [];

  /**
   * Run one PAVA sweep over the given node id list. Outer sweep passes
   * `crossPinned` from node data; inner group sweeps pass no pins (inner
   * coordinates are a private dagre region that should stay repairable).
   * Returns true if any node moved.
   */
  const runSweep = (nodeIds: readonly string[], useOuterPins: boolean): boolean => {
    if (nodeIds.length < 2) return false;
    let anyMoved = false;

    // Event points: the distinct main-axis starts of all nodes in this set.
    const eventPoints = [...new Set(nodeIds.map(mainOf))].sort((a, b) => a - b);

    for (const y0 of eventPoints) {
      // Active set = nodes whose main-axis interval contains y0.
      const active = nodeIds.filter((id) => {
        const m = mainOf(id);
        return m <= y0 && y0 < m + mainSpanOf(id);
      });
      if (active.length < 2) continue;

      // Sort by current cross-axis left edge.
      active.sort((a, b) => crossOf(a) - crossOf(b));

      // PAVA expects box-center positions.
      const centers = active.map((id) => crossOf(id) + crossSpanOf(id) / 2);
      const widths = active.map(crossSpanOf);

      // Build pin mask from crossPinned (outer sweep only).
      let pinned: boolean[] | undefined;
      if (useOuterPins) {
        const maskCandidates = active.map((id) => {
          const idx = idxById.get(id);
          return idx !== undefined && (nodes[idx].crossPinned === true);
        });
        if (maskCandidates.some(Boolean)) pinned = maskCandidates;
      }

      const resolved = resolveCrossAxisOverlaps(centers, widths, nodeSep, pinned);
      if (resolved === centers) continue; // no change — all centers already valid.

      // Collect any relaxed pins (when resolveCrossAxisOverlaps demoted pins,
      // a pinned node's center in `resolved` differs from its center in `centers`).
      if (pinned) {
        for (let i = 0; i < active.length; i++) {
          if (pinned[i] && Math.abs(resolved[i] - centers[i]) > 0.001) {
            relaxedPinNodeIds.push(active[i]);
          }
        }
      }

      for (let i = 0; i < active.length; i++) {
        const newCross = resolved[i] - widths[i] / 2; // center → left edge
        const id = active[i];
        const oldCross = crossOf(id);
        if (Math.abs(newCross - oldCross) < 0.001) continue;
        const delta = newCross - oldCross;
        setCross(id, newCross);
        anyMoved = true;
        // Carry inner nodes of any group that moved.
        const innerIds = groupInnerLists.get(id);
        if (innerIds) {
          for (const innerId of innerIds) {
            setCross(innerId, crossOf(innerId) + delta);
          }
        }
      }
    }
    return anyMoved;
  };

  // Iterate outer + inner sweeps to stability.
  for (let iter = 0; iter < SEPARATE_OVERLAPS_MAX_ITERS; iter++) {
    let anyMoved = runSweep(outerNodeIds, true);
    for (const innerIds of groupInnerLists.values()) {
      if (runSweep(innerIds, false)) anyMoved = true;
    }
    if (!anyMoved) break;
  }

  // Write updated cross positions back to the node array.
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const newCross = crossPos.get(n.id);
    if (newCross === undefined) continue;
    if (crossAxis === 'x') {
      if (Math.abs(newCross - n.x) < 0.001) continue;
      nodes[i] = { ...n, x: newCross };
    } else {
      if (Math.abs(newCross - n.y) < 0.001) continue;
      nodes[i] = { ...n, y: newCross };
    }
  }

  return { relaxedPinIds: relaxedPinNodeIds };
};
