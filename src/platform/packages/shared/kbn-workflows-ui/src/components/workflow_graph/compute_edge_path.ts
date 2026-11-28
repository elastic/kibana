/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSmoothStepPath, Position } from '@xyflow/react';
import type { EdgeBranchType } from '@kbn/workflows';
import { FORK_BUS_LABEL_OFFSET, FORK_BUS_TRUNK, MERGE_BUS_TRUNK } from './workflow_graph_geometry';

const CORNER_RADIUS = 4;
const EPS = 0.5;

export interface ComputeEdgePathInput {
  readonly sourceX: number;
  readonly sourceY: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly sourcePosition: Position;
  readonly targetPosition: Position;
  readonly branchType?: EdgeBranchType;
  readonly isMerge?: boolean;
  /**
   * True on the failure edge from a fallback-lane owner to its lane head. Routes
   * the edge with `buildFailureLanePath` (trunk + across + drop) rather than the
   * fork bus or smooth-step. The spine edge carries no flag and uses
   * smooth-step.
   */
  readonly isFailure?: boolean;
  /**
   * True when this edge targets a bypass lane node (invisible 1×1 layout helper
   * for an empty branch). Skips the fork-bus routing so the edge renders as a
   * straight diagonal rather than a right-angle bus shape.
   */
  readonly hideEndMarker?: boolean;
}

/**
 * For each pair of consecutive points, if the segment is diagonal (neither
 * horizontal nor vertical), insert an "elbow" point so the segment becomes
 * two right-angle segments. The elbow is chosen so the line first continues
 * in the same direction as the previous segment, then turns 90°.
 */
function enforceOrthogonal(
  points: Array<{ x: number; y: number }>
): Array<{ x: number; y: number }> {
  if (points.length < 2) return points;
  const out: Array<{ x: number; y: number }> = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = out[out.length - 1];
    const curr = points[i];
    const dx = Math.abs(curr.x - prev.x);
    const dy = Math.abs(curr.y - prev.y);
    if (dx < EPS || dy < EPS) {
      out.push(curr);
    } else {
      // Diagonal — break into horizontal-first then vertical when going
      // downward (the workflow case), so the horizontal lane sits near the
      // source rather than at the target. For upward / reverse cases, keep
      // the previous orientation flowing.
      const goingDown = curr.y > prev.y + EPS;
      const elbow = goingDown
        ? { x: curr.x, y: prev.y } // horizontal at prev.y, then descend
        : { x: prev.x, y: curr.y }; // vertical first, then horizontal
      out.push(elbow);
      out.push(curr);
    }
  }
  return out;
}

/**
 * Build an orthogonal SVG path through the given waypoints with rounded
 * corners (radius `r`) at each interior vertex. Falls back to straight
 * line segments when there isn't enough room for the curve.
 *
 * Exported for unit testing.
 */
export function buildRoundedOrthogonalPath(
  inputPoints: Array<{ x: number; y: number }>,
  r: number
): { path: string; labelX: number; labelY: number } {
  const points = enforceOrthogonal(inputPoints);
  if (points.length < 2) {
    return { path: '', labelX: 0, labelY: 0 };
  }
  const first = points[0];
  let d = `M ${first.x} ${first.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const lenIn = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const lenOut = Math.hypot(next.x - curr.x, next.y - curr.y);
    if (lenIn < EPS || lenOut < EPS) {
      // Collinear / zero-length neighbour — skip the curve, just draw to curr.
      d += ` L ${curr.x} ${curr.y}`;
    } else {
      const radius = Math.min(r, lenIn / 2, lenOut / 2);
      const inDirX = (curr.x - prev.x) / lenIn;
      const inDirY = (curr.y - prev.y) / lenIn;
      const outDirX = (next.x - curr.x) / lenOut;
      const outDirY = (next.y - curr.y) / lenOut;
      const enterX = curr.x - inDirX * radius;
      const enterY = curr.y - inDirY * radius;
      const exitX = curr.x + outDirX * radius;
      const exitY = curr.y + outDirY * radius;
      d += ` L ${enterX} ${enterY} Q ${curr.x} ${curr.y} ${exitX} ${exitY}`;
    }
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  // Anchor the label on the longest VERTICAL segment of the path, ideally
  // the descending one closest to the target. Falls back to the geometric
  // midpoint when the path has no vertical segments.
  let bestIdx = -1;
  let bestLen = -1;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const isVertical = Math.abs(a.x - b.x) < EPS;
    if (isVertical) {
      const len = Math.abs(b.y - a.y);
      // Prefer the latest (closest to target) vertical segment when lengths
      // tie, so labels sit on the descent rather than the source trunk.
      if (len > bestLen + EPS || (len > bestLen - EPS && i > bestIdx)) {
        bestLen = len;
        bestIdx = i;
      }
    }
  }
  const labelAnchor =
    bestIdx >= 0
      ? {
          x: points[bestIdx].x,
          y: (points[bestIdx - 1].y + points[bestIdx].y) / 2,
        }
      : { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 };
  return { path: d, labelX: labelAnchor.x, labelY: labelAnchor.y };
}

/**
 * Build the SVG path for a fork-edge single-bus routing. All branch edges of
 * one fork node (switch case/default, if-then, if-else) share the same
 * sourceX/sourceY, so their trunks and bus line (busY or busX) are identical —
 * they naturally overlay into one visible trunk + one bus. Labels sit at a
 * fixed offset below/right of the bus so all branch labels align on one row
 * (TB) / one column (LR) regardless of how deep each branch target sits.
 *
 * TB shape: source → trunk down → bus horizontal → drop vertical → target.
 * LR shape: source → trunk right → bus vertical → drop horizontal → target.
 *
 * Exported for unit testing.
 */
export function buildForkBusPath(
  p: { sourceX: number; sourceY: number; targetX: number; targetY: number },
  isLR: boolean,
  trunk: number
): { path: string; labelX: number; labelY: number } {
  const { sourceX: sx, sourceY: sy, targetX: tx, targetY: ty } = p;
  if (isLR) {
    const busX = sx + trunk;
    const { path } = buildRoundedOrthogonalPath(
      [
        { x: sx - 2, y: sy },
        { x: busX, y: sy },
        { x: busX, y: ty },
        { x: tx, y: ty },
      ],
      CORNER_RADIUS
    );
    return { path, labelX: busX + FORK_BUS_LABEL_OFFSET, labelY: ty };
  } else {
    const busY = sy + trunk;
    const { path } = buildRoundedOrthogonalPath(
      [
        { x: sx, y: sy - 2 },
        { x: sx, y: busY },
        { x: tx, y: busY },
        { x: tx, y: ty },
      ],
      CORNER_RADIUS
    );
    return { path, labelX: tx, labelY: busY + FORK_BUS_LABEL_OFFSET };
  }
}

/**
 * Build the SVG path for a failure-lane edge. The owner exits via a short
 * trunk, then turns horizontally (TB) or vertically (LR) to reach the target's
 * column, then descends (or advances) to the target. Unlike `buildForkBusPath`
 * this path is never shared with a sibling edge.
 *
 * TB shape: source → trunk down → across to target-X → down to target.
 * LR shape: source (bottom edge, inset from right) → drop to target-Y → run right to target.
 *   The failure handle is unconditionally `Position.Bottom`, so the route leaves the bottom
 *   edge and drops perpendicularly before turning right into the lane head.
 *
 * Exported for unit testing.
 */
export function buildFailureLanePath(
  p: { sourceX: number; sourceY: number; targetX: number; targetY: number },
  isLR: boolean,
  trunk: number
): { path: string; labelX: number; labelY: number } {
  const { sourceX: sx, sourceY: sy, targetX: tx, targetY: ty } = p;
  if (isLR) {
    // Handle is on the bottom edge — drop straight to the lane head's row, then run right.
    const { path } = buildRoundedOrthogonalPath(
      [
        { x: sx, y: sy - 2 },
        { x: sx, y: ty },
        { x: tx, y: ty },
      ],
      CORNER_RADIUS
    );
    return { path, labelX: (sx + tx) / 2, labelY: ty - FORK_BUS_LABEL_OFFSET };
  }
  const busY = sy + trunk;
  const { path } = buildRoundedOrthogonalPath(
    [
      { x: sx, y: sy - 2 },
      { x: sx, y: busY },
      { x: tx, y: busY },
      { x: tx, y: ty },
    ],
    CORNER_RADIUS
  );
  return { path, labelX: tx, labelY: busY + FORK_BUS_LABEL_OFFSET };
}

/**
 * Build the SVG path for a merge-edge single-bus routing. The inverse of
 * `buildForkBusPath`: all fan-in edges sharing the same target meet at a shared
 * horizontal bus just above the target (TB) or a vertical bus just left of the
 * target (LR), then one shared trunk descends / advances into the target.
 * Because all edges share targetX/targetY, their buses and trunks overlap into
 * one visible bus + one trunk, exactly mirroring the fork bus.
 *
 * TB shape: source → drop vertical to busY → bus horizontal to targetX → trunk down to target.
 * LR shape: source → drop horizontal to busX → bus vertical to targetY → trunk right to target.
 *
 * Exported for unit testing.
 */
export function buildMergeBusPath(
  p: { sourceX: number; sourceY: number; targetX: number; targetY: number },
  isLR: boolean,
  trunk: number
): { path: string; labelX: number; labelY: number } {
  const { sourceX: sx, sourceY: sy, targetX: tx, targetY: ty } = p;
  if (isLR) {
    const busX = tx - trunk;
    const { path, labelX, labelY } = buildRoundedOrthogonalPath(
      [
        { x: sx - 2, y: sy },
        { x: busX, y: sy },
        { x: busX, y: ty },
        { x: tx, y: ty },
      ],
      CORNER_RADIUS
    );
    return { path, labelX, labelY };
  } else {
    const busY = ty - trunk;
    const { path, labelX, labelY } = buildRoundedOrthogonalPath(
      [
        { x: sx, y: sy - 2 },
        { x: sx, y: busY },
        { x: tx, y: busY },
        { x: tx, y: ty },
      ],
      CORNER_RADIUS
    );
    return { path, labelX, labelY };
  }
}

/**
 * Pure SVG-path computation for a workflow graph edge. Contains all routing
 * decisions (failure lane, fork-bus, merge-bus, smooth-step fallback).
 * Returns `{ path, labelX, labelY }` with no React/DOM dependency.
 */
export const computeEdgePath = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  branchType,
  isMerge,
  isFailure,
  hideEndMarker,
}: ComputeEdgePathInput): { path: string; labelX: number; labelY: number } => {
  // Single-bus routing for all fork (fan-out) edges: switch case/default,
  // if-then, and if-else. All branch edges of one fork node share the same
  // sourceX/sourceY, so their trunks and bus line overlap into one visible
  // trunk + one continuous bus. Each edge then drops straight from the bus to
  // its own target. Labels sit at a fixed offset below the bus (TB) / right of
  // the bus (LR) so all branch labels align on one row/column regardless of
  // how deep each branch target sits.
  //
  // Bypass-lane targets (hideEndMarker=true, invisible 1×1 nodes for empty
  // branches) intentionally use the same bus shape so all empty-case stubs
  // spread out in a proper fan-out — consistent with non-empty branches and
  // ensures labels at different targetX values sit on an aligned row.
  const isForkEdge =
    branchType === 'switch' ||
    branchType === 'then' ||
    branchType === 'else' ||
    branchType === 'parallel';
  // isLR checks both sides: the failure handle is unconditionally Position.Bottom (so that
  // the edge exits the bottom edge in both TB and LR), but spine/fork edges still anchor
  // on the right in LR. The target side is always direction-faithful, so checking it
  // avoids mis-routing a failure edge in LR through the TB branch.
  const isLR =
    sourcePosition === Position.Right ||
    sourcePosition === Position.Left ||
    targetPosition === Position.Right ||
    targetPosition === Position.Left;
  const forkGap = isLR ? targetX - sourceX : targetY - sourceY;
  const useFork = isForkEdge && forkGap > FORK_BUS_TRUNK;

  // Single-bus routing for tagged merge (fan-in) edges: any edge whose target
  // has multiple predecessors. All such edges share the same targetX/targetY,
  // so their buses and trunks overlay into one visible bus + one trunk — the
  // symmetric inverse of the fork bus. Fork and merge are disjoint: a fork
  // edge's target is either a bypass lane or a branch's first inner node, so it
  // always has exactly one predecessor — useFork-before-useMerge never shadows.
  const isMergeEdge = isMerge === true;
  const mergeGap = isLR ? targetX - sourceX : targetY - sourceY;
  const useMerge = isMergeEdge && mergeGap > MERGE_BUS_TRUNK;

  // Dedicated routing for failure-lane edges: trunk + across + drop into lane head.
  // Checked before fork/merge so the failure edge is never misrouted as a bus.
  if (isFailure === true) {
    return buildFailureLanePath({ sourceX, sourceY, targetX, targetY }, isLR, FORK_BUS_TRUNK);
  }

  if (useFork) {
    return buildForkBusPath({ sourceX, sourceY, targetX, targetY }, isLR, FORK_BUS_TRUNK);
  }

  if (useMerge) {
    return buildMergeBusPath({ sourceX, sourceY, targetX, targetY }, isLR, MERGE_BUS_TRUNK);
  }

  // Smooth-step fallback: not a failure, fork or merge bus edge.
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: CORNER_RADIUS,
  });
  return { path, labelX, labelY };
};
