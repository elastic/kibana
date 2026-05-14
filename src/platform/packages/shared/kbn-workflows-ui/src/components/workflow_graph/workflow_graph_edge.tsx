/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiToolTip } from '@elastic/eui';
import type { EdgeProps } from '@xyflow/react';
import { EdgeLabelRenderer, getSmoothStepPath, Position } from '@xyflow/react';
import React from 'react';

interface WorkflowEdgeData extends Record<string, unknown> {
  label?: string;
  traversed?: boolean;
  points?: Array<{ x: number; y: number }>;
}

const LABEL_TRUNCATE = 24;
const CORNER_RADIUS = 4;
// Vertical (TB) / horizontal (LR) stub at each endpoint so multiple edges
// leaving (or entering) the same node visually share a trunk before they
// split. The source stub is shorter than the target stub so branching edges
// (`if` / `parallel`) bend tight under the source instead of leaving a
// large gap to the divergence point.
const TRUNK_LENGTH_FROM_SOURCE = 9;
const TRUNK_LENGTH_TO_TARGET = 14;

const EPS = 0.5;

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
 */
function buildRoundedOrthogonalPath(
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

export function WorkflowGraphEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    style = {},
  } = props;
  const edgeData = data as WorkflowEdgeData | undefined;

  // If dagre supplied waypoints, route the edge through them so it avoids
  // other nodes. Replace dagre's first/last (which sit at node centres)
  // with React Flow's source/target so the path starts/ends on the node
  // border the same way the smooth-step fallback does.
  const dagrePoints = edgeData?.points;
  let edgePath: string;
  let labelX: number;
  let labelY: number;
  if (dagrePoints && dagrePoints.length >= 2) {
    let middle = dagrePoints.slice(1, -1).map((p) => ({ x: p.x, y: p.y }));
    const isLR = sourcePosition === Position.Right || sourcePosition === Position.Left;

    if (isLR) {
      // LR layout: trunks are horizontal stubs off the left/right handle.
      const trunkSourceX = sourceX + TRUNK_LENGTH_FROM_SOURCE;
      const trunkTargetX = targetX - TRUNK_LENGTH_TO_TARGET;
      // Find the FIRST vertical segment in the dagre middle and replace
      // everything before it with a horizontal stub at trunkSourceX.
      for (let i = 0; i < middle.length - 1; i++) {
        const dx = Math.abs(middle[i].x - middle[i + 1].x);
        const dy = Math.abs(middle[i].y - middle[i + 1].y);
        if (dx < EPS && dy > EPS) {
          middle = [
            { x: trunkSourceX, y: middle[i].y },
            { x: trunkSourceX, y: middle[i + 1].y },
            ...middle.slice(i + 2),
          ];
          break;
        }
      }
      // Find the LAST vertical segment and replace everything after it
      // with a horizontal stub at trunkTargetX.
      for (let i = middle.length - 2; i >= 0; i--) {
        const dx = Math.abs(middle[i].x - middle[i + 1].x);
        const dy = Math.abs(middle[i].y - middle[i + 1].y);
        if (dx < EPS && dy > EPS) {
          middle = [
            ...middle.slice(0, i),
            { x: trunkTargetX, y: middle[i].y },
            { x: trunkTargetX, y: middle[i + 1].y },
          ];
          break;
        }
      }
      const adjusted: Array<{ x: number; y: number }> = [
        // Source overshoot 2 px back into the node (hidden by opaque body),
        // target ends exactly on the border (no bleed through translucent
        // headers). Same reasoning as the TB branch below.
        { x: sourceX - 2, y: sourceY },
        { x: trunkSourceX, y: sourceY },
        ...middle,
        { x: trunkTargetX, y: targetY },
        { x: targetX, y: targetY },
      ];
      const built = buildRoundedOrthogonalPath(adjusted, CORNER_RADIUS);
      edgePath = built.path;
      labelX = (sourceX + targetX) / 2;
      labelY = targetY;
    } else {
      // TB layout: trunks are vertical stubs off the top/bottom handle.
      const trunkSourceY = sourceY + TRUNK_LENGTH_FROM_SOURCE;
      const trunkTargetY = targetY - TRUNK_LENGTH_TO_TARGET;
      // "Effectively straight" detection: source, target, and every dagre
      // middle waypoint share an X within a generous tolerance. Without
      // this, dagre's per-rank positioning drift (especially between a
      // trigger node and the first regular step, or before/after a wide
      // foreach group) gets materialised by the trunk-stub elbow logic
      // as a small horizontal jog just below the source. A real branch
      // diverges far more than this (a whole node width plus separation),
      // so the threshold can safely sit well above any drift we observe.
      const STRAIGHT_X_THRESHOLD = 100;
      const allXs = [sourceX, targetX, ...middle.map((p) => p.x)];
      const xSpread = Math.max(...allXs) - Math.min(...allXs);
      if (xSpread < STRAIGHT_X_THRESHOLD) {
        const straightX = sourceX;
        const builtStraight = buildRoundedOrthogonalPath(
          [
            // Source: extend 2 px back into the node so the line meets the
            // bottom border with no visible gap. (Hidden by the opaque
            // source body.) Target: end exactly on the border so no
            // overshoot can bleed through a translucent container header.
            { x: straightX, y: sourceY - 2 },
            { x: straightX, y: trunkSourceY },
            { x: straightX, y: trunkTargetY },
            { x: straightX, y: targetY },
          ],
          CORNER_RADIUS
        );
        edgePath = builtStraight.path;
        labelX = straightX;
        labelY = (sourceY + targetY) / 2;
      } else {
      // Find the FIRST horizontal segment in the dagre middle. Replace any
      // points before it with a single endpoint at trunk-Y so the bend
      // happens right after the source instead of at the mid-edge (where
      // labels sit). Works for any shape — single-bend or multi-bend.
      for (let i = 0; i < middle.length - 1; i++) {
        const dx = Math.abs(middle[i].x - middle[i + 1].x);
        const dy = Math.abs(middle[i].y - middle[i + 1].y);
        if (dy < EPS && dx > EPS) {
          middle = [
            { x: middle[i].x, y: trunkSourceY },
            { x: middle[i + 1].x, y: trunkSourceY },
            ...middle.slice(i + 2),
          ];
          break;
        }
      }
      // Find the LAST horizontal segment and pull it down to trunk-Y of
      // the target. Replace anything after it with a single endpoint so
      // multiple incoming edges share their final approach.
      for (let i = middle.length - 2; i >= 0; i--) {
        const dx = Math.abs(middle[i].x - middle[i + 1].x);
        const dy = Math.abs(middle[i].y - middle[i + 1].y);
        if (dy < EPS && dx > EPS) {
          middle = [
            ...middle.slice(0, i),
            { x: middle[i].x, y: trunkTargetY },
            { x: middle[i + 1].x, y: trunkTargetY },
          ];
          break;
        }
      }
      const adjusted: Array<{ x: number; y: number }> = [
        // Source: extend 2 px back into the node (hidden by the opaque
        // body) so the line meets the bottom border with no visible gap.
        // Target: end exactly on the border so no overshoot can bleed
        // through a translucent container header.
        { x: sourceX, y: sourceY - 2 },
        { x: sourceX, y: trunkSourceY },
        ...middle,
        { x: targetX, y: trunkTargetY },
        { x: targetX, y: targetY },
      ];
      const built = buildRoundedOrthogonalPath(adjusted, CORNER_RADIUS);
      edgePath = built.path;
      labelX = targetX;
      labelY = (sourceY + targetY) / 2;
      }
    }
  } else {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: CORNER_RADIUS,
    });
  }

  const traversed = edgeData?.traversed ?? false;
  // Match the success color used by the node's green checkmark icon (#16c5c0).
  // Non-traversed edges use a muted blue to match the step palette.
  const stroke = traversed ? '#16c5c0' : '#a8c5ee';
  const strokeWidth = 1;

  const fullLabel = edgeData?.label ?? '';
  const truncated =
    fullLabel.length > LABEL_TRUNCATE ? `${fullLabel.slice(0, LABEL_TRUNCATE - 1)}…` : fullLabel;

  return (
    <>
      <defs>
        <marker
          id={`arrow-${id}`}
          markerWidth="6"
          markerHeight="6"
          refX="6"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          {/* Triangle pointing right; orient="auto" rotates it to the path
              tangent at the endpoint automatically. refX=6 places the tip
              (rightmost point) exactly at the path endpoint. */}
          <path d="M0,0 L0,6 L6,3 z" fill={stroke} />
        </marker>
      </defs>
      <path
        id={id}
        style={{ ...style, stroke, strokeWidth, fill: 'none' }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={`url(#arrow-${id})`}
      />
      {fullLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              padding: '0 12px',
              borderRadius: 8,
              fontFamily: '"Roboto Mono", monospace',
              fontSize: 11,
              fontWeight: 400,
              lineHeight: '20px',
              background: '#f6f9fc',
              border: '1px solid #bfdbff',
              color: '#1d2a3e',
              whiteSpace: 'nowrap',
            }}
          >
            <EuiToolTip content={fullLabel} position="top">
              <span>{truncated}</span>
            </EuiToolTip>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
