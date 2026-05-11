/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { EdgeProps } from '@xyflow/react';
import { EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';
import { getExecutionStatusVisual } from './get_execution_status_color';

interface WorkflowEdgeData extends Record<string, unknown> {
  label?: string;
  traversed?: boolean;
  traversedStatus?: ExecutionStatus | null;
  points?: Array<{ x: number; y: number }>;
}

const LABEL_TRUNCATE = 24;
const CORNER_RADIUS = 4;
// Vertical stub at each endpoint so multiple edges leaving (or entering)
// the same node visually share a trunk before they split. Sized so the
// horizontal turn sits right under the source step.
const TRUNK_LENGTH = 14;

const EPS = 0.5;

/**
 * For each pair of consecutive points, if the segment is diagonal (neither
 * horizontal nor vertical), insert an "elbow" point so the segment becomes
 * two right-angle segments. The elbow is chosen so the line first continues
 * in the same direction as the previous segment, then turns 90°.
 */
function enforceOrthogonal(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (points.length < 2) return points;
  const out: Array<{ x: number; y: number }> = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = out[out.length - 1];
    const curr = points[i];
    const dx = Math.abs(curr.x - prev.x);
    const dy = Math.abs(curr.y - prev.y);
    if (dx < EPS || dy < EPS) {
      out.push(curr);
      continue;
    }
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
      continue;
    }
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
    if (!isVertical) continue;
    const len = Math.abs(b.y - a.y);
    // Prefer the latest (closest to target) vertical segment when lengths
    // tie, so labels sit on the descent rather than the source trunk.
    if (len > bestLen + EPS || (len > bestLen - EPS && i > bestIdx)) {
      bestLen = len;
      bestIdx = i;
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
  const { euiTheme } = useEuiTheme();
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
    const trunkSourceY = sourceY + TRUNK_LENGTH;
    const trunkTargetY = targetY - TRUNK_LENGTH;
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
    // Extend each endpoint 2px into its node so the line/arrow visually
    // touches the source/target without a gap (React Flow handles sit
    // exactly on the node edge, which can read as a sub-pixel gap with a
    // 1px stroke + arrow marker).
    const adjusted: Array<{ x: number; y: number }> = [
      { x: sourceX, y: sourceY - 2 },
      { x: sourceX, y: trunkSourceY },
      ...middle,
      { x: targetX, y: trunkTargetY },
      { x: targetX, y: targetY + 2 },
    ];
    const built = buildRoundedOrthogonalPath(adjusted, CORNER_RADIUS);
    edgePath = built.path;
    // Always anchor the label at the geometric midpoint between source and
    // target rows, on the target column (which is where the descending
    // segment runs). This keeps the badge centered in the gap between rows
    // rather than drifting toward whichever segment the path-builder
    // considered "longest".
    labelX = targetX;
    labelY = (sourceY + targetY) / 2;
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
  const traversedVisual = traversed
    ? getExecutionStatusVisual(euiTheme, edgeData?.traversedStatus ?? ExecutionStatus.COMPLETED)
    : null;
  // Figma uses a muted blue for non-traversed edges to match the step palette.
  const stroke = traversedVisual?.color ?? '#a8c5ee';
  const strokeWidth = traversed ? 2 : 1;

  const fullLabel = edgeData?.label ?? '';
  const truncated =
    fullLabel.length > LABEL_TRUNCATE ? `${fullLabel.slice(0, LABEL_TRUNCATE - 1)}…` : fullLabel;

  return (
    <>
      <defs>
        <marker
          id={`arrow-${id}`}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill={stroke} />
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
