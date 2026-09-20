/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DagPositionedEdge, DagPositionedNode } from '@kbn/dag-layout';
import type { GraphEdge, LayoutDirection } from '@kbn/workflows';
import { ERROR_PORT_INSET } from './port_geometry';
import { WORKFLOW_NODE_SEP, WORKFLOW_RANK_SEP } from './workflow_layout_pipeline';

/** Min gap between an error-edge segment and any node it does not connect. */
export const ERROR_EDGE_CLEARANCE = 24;
/** Min gap between adjacent parallel edge runs. */
export const ERROR_PARALLEL_GAP = 16;

export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Ideal top-left for an on-failure fallback: one column right of the owner.
 * Y is the first candidate lane (one gap below the owner); occupancy may push
 * further or insert a lane — see {@link resolveErrorBranchPlacement}.
 */
export function computeErrorBranchNodeOrigin(
  owner: Bounds,
  direction: LayoutDirection
): { x: number; y: number } {
  if (direction === 'LR') {
    return {
      x: owner.maxX + WORKFLOW_RANK_SEP,
      y: owner.maxY + WORKFLOW_NODE_SEP,
    };
  }
  return {
    x: owner.maxX + WORKFLOW_NODE_SEP,
    y: owner.maxY + WORKFLOW_RANK_SEP,
  };
}

/** Vertical pitch between consecutive error-lane candidates. */
export function errorLaneStep(fallbackHeight: number, direction: LayoutDirection): number {
  const gap = direction === 'LR' ? WORKFLOW_NODE_SEP : WORKFLOW_RANK_SEP;
  return fallbackHeight + gap;
}

const rangesOverlap = (a0: number, a1: number, b0: number, b1: number, pad: number): boolean =>
  a0 < b1 + pad && b0 < a1 + pad;

/**
 * True when a candidate lane band is blocked for the orthogonal error edge:
 * any obstacle intersects the lane's Y band across the horizontal span from
 * the drop (error-port X) to the fallback's left edge, or sits in the drop
 * corridor from the owner's bottom to the lane.
 */
export function isErrorLaneOccupied({
  laneY,
  laneHeight,
  dropX,
  fallbackLeft,
  ownerBottom,
  obstacles,
}: {
  readonly laneY: number;
  readonly laneHeight: number;
  readonly dropX: number;
  readonly fallbackLeft: number;
  readonly ownerBottom: number;
  readonly obstacles: readonly Rect[];
}): boolean {
  const spanLeft = Math.min(dropX, fallbackLeft);
  const spanRight = Math.max(dropX, fallbackLeft);
  const laneBottom = laneY + laneHeight;
  const clearance = ERROR_EDGE_CLEARANCE;

  for (const o of obstacles) {
    const oRight = o.x + o.width;
    const oBottom = o.y + o.height;

    // Horizontal run corridor: lane band × edge span.
    if (
      rangesOverlap(laneY, laneBottom, o.y, oBottom, clearance) &&
      rangesOverlap(spanLeft, spanRight, o.x, oRight, clearance)
    ) {
      return true;
    }

    // Drop corridor: thin vertical strip at dropX from owner bottom to lane.
    if (
      rangesOverlap(ownerBottom, laneBottom, o.y, oBottom, clearance) &&
      rangesOverlap(dropX, dropX, o.x, oRight, clearance)
    ) {
      return true;
    }
  }
  return false;
}

export interface ErrorBranchPlacementResult {
  /** Top-left for the fallback / pending card. */
  readonly origin: { x: number; y: number };
  /**
   * When the first lane was occupied, unrelated nodes at/below that lane are
   * shifted down by one lane step so the horizontal run is never colinear with
   * a sibling row. Keys are node ids.
   */
  readonly shifts: ReadonlyMap<string, { dx: number; dy: number }>;
}

/**
 * Resolve fallback placement: first free lane below the owner across the edge
 * span, or insert a lane (shift occupying rows down) when the first candidate
 * is blocked.
 */
export function resolveErrorBranchPlacement({
  owner,
  fallbackSize,
  obstacles,
  direction,
  obstacleIds,
}: {
  readonly owner: Bounds;
  readonly fallbackSize: { width: number; height: number };
  readonly obstacles: readonly Rect[];
  readonly direction: LayoutDirection;
  /** Parallel to `obstacles` — ids used when emitting shifts. */
  readonly obstacleIds?: readonly string[];
}): ErrorBranchPlacementResult {
  const ideal = computeErrorBranchNodeOrigin(owner, direction);
  const dropX = owner.maxX - ERROR_PORT_INSET;
  const step = errorLaneStep(fallbackSize.height, direction);

  const free = !isErrorLaneOccupied({
    laneY: ideal.y,
    laneHeight: fallbackSize.height,
    dropX,
    fallbackLeft: ideal.x,
    ownerBottom: owner.maxY,
    obstacles,
  });

  if (free) {
    return { origin: ideal, shifts: new Map() };
  }

  // Insert a lane at the ideal Y: push every obstacle that intersects or lies
  // below that band down by one lane step, then place the fallback at ideal.
  const shifts = new Map<string, { dx: number; dy: number }>();
  const insertTop = ideal.y - ERROR_EDGE_CLEARANCE;
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (o.y + o.height <= insertTop) continue;
    const id = obstacleIds?.[i];
    if (id) shifts.set(id, { dx: 0, dy: step });
  }

  return { origin: ideal, shifts };
}

const reachableExclusive = (
  start: string,
  outgoing: ReadonlyMap<string, readonly string[]>,
  blocked: ReadonlySet<string>
): Set<string> => {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id) || (id !== start && blocked.has(id))) continue;
    seen.add(id);
    for (const next of outgoing.get(id) ?? []) {
      stack.push(next);
    }
  }
  return seen;
};

export interface EnforceErrorBranchPlacementInput {
  readonly nodes: readonly DagPositionedNode[];
  readonly edges: readonly DagPositionedEdge[];
  readonly domainEdges: readonly GraphEdge[];
  readonly direction: LayoutDirection;
}

/**
 * Pin each on-failure fallback to a clear below+right lane (inserting a lane
 * when the first candidate is occupied), then drop stale dagre waypoints.
 */
export const enforceErrorBranchPlacement = ({
  nodes,
  edges,
  domainEdges,
  direction,
}: EnforceErrorBranchPlacementInput): {
  nodes: DagPositionedNode[];
  edges: DagPositionedEdge[];
} => {
  const byId = new Map(nodes.map((n) => [n.id, { ...n }]));
  const delta = new Map<string, { dx: number; dy: number }>();

  const outgoing = new Map<string, string[]>();
  for (const e of domainEdges) {
    const list = outgoing.get(e.source);
    if (list) list.push(e.target);
    else outgoing.set(e.source, [e.target]);
  }

  const failureEdges = domainEdges.filter((e) => e.isFailure);
  for (const e of failureEdges) {
    const owner = byId.get(e.source);
    const head = byId.get(e.target);
    if (!owner || !head) continue;

    const moveSet = reachableExclusive(e.target, outgoing, new Set([e.source]));
    const obstacleNodes = [...byId.values()].filter(
      (n) => !moveSet.has(n.id) && n.id !== owner.id
    );
    const obstacles = obstacleNodes.map((n) => ({
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
    }));
    const obstacleIds = obstacleNodes.map((n) => n.id);

    const { origin, shifts } = resolveErrorBranchPlacement({
      owner: {
        minX: owner.x,
        minY: owner.y,
        maxX: owner.x + owner.width,
        maxY: owner.y + owner.height,
      },
      fallbackSize: { width: head.width, height: head.height },
      obstacles,
      direction,
      obstacleIds,
    });

    for (const [id, s] of shifts) {
      const node = byId.get(id);
      if (!node) continue;
      node.x += s.dx;
      node.y += s.dy;
      const prev = delta.get(id) ?? { dx: 0, dy: 0 };
      delta.set(id, { dx: prev.dx + s.dx, dy: prev.dy + s.dy });
    }

    const dx = origin.x - head.x;
    const dy = origin.y - head.y;
    if (dx !== 0 || dy !== 0) {
      for (const id of moveSet) {
        const node = byId.get(id);
        if (!node) continue;
        node.x += dx;
        node.y += dy;
        const prev = delta.get(id) ?? { dx: 0, dy: 0 };
        delta.set(id, { dx: prev.dx + dx, dy: prev.dy + dy });
      }
    }
  }

  if (delta.size === 0) {
    return { nodes: [...byId.values()], edges: [...edges] };
  }

  const nextEdges = edges.map((edge) => {
    const ds = delta.get(edge.source);
    const dt = delta.get(edge.target);
    if (!ds && !dt) return edge;
    return { ...edge, points: [] as typeof edge.points };
  });

  return { nodes: [...byId.values()], edges: nextEdges };
};
