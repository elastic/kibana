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
import { EdgeLabelRenderer } from '@xyflow/react';
import React, { memo } from 'react';
import type { EdgeBranchType } from '@kbn/workflows';
import { computeEdgePath } from './compute_edge_path';

interface WorkflowEdgeData extends Record<string, unknown> {
  readonly label?: string;
  readonly traversed?: boolean;
  readonly points?: ReadonlyArray<{ readonly x: number; readonly y: number }>;
  /** Switch bus routing marker — present on all case/default edges of a switch node. */
  readonly branchType?: EdgeBranchType;
  /**
   * True when this edge participates in a fan-in that includes a synthetic
   * placeholder (empty `if` branch lane). Routes the edge on the merge bus
   * (symmetric inverted-bus fan-in matching the fork-bus fan-out).
   */
  readonly isMerge?: boolean;
  /**
   * True when the target node is a synthetic placeholder — suppresses the
   * arrowhead so the in-edge and out-edge form one continuous line mid-lane.
   */
  readonly hideEndMarker?: boolean;
}

const LABEL_TRUNCATE = 24;
// Branch labels are annotations on the graph and must paint above the container
// frames they sit inside — a foreach/while body is a 50%-opaque panel that would
// otherwise veil them. `.react-flow__edgelabel-renderer` ships no z-index, and it
// is a sibling of `.react-flow__nodes` (which also has none), so labels tie with
// nodes at level 0 and lose on DOM order.
// Must exceed the deepest node z-index, which in `zIndexMode: 'basic'` with
// `elevateNodesOnSelect={false}` equals the container nesting depth.
const EDGE_LABEL_Z_INDEX = 10;

function WorkflowGraphEdgeInner(props: EdgeProps) {
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
  const { euiTheme } = useEuiTheme();

  const {
    path: edgePath,
    labelX,
    labelY,
  } = computeEdgePath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    points: edgeData?.points,
    branchType: edgeData?.branchType,
    isMerge: edgeData?.isMerge,
  });

  const traversed = edgeData?.traversed ?? false;
  // Traversed edges use the `success` token to match the node's success state.
  // Non-traversed edges use `borderBaseProminent` — two shade steps darker than
  // `borderBasePlain` so edges read as the stronger element on the canvas.
  const stroke = traversed ? euiTheme.colors.success : euiTheme.colors.borderBaseProminent;
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
        markerEnd={edgeData?.hideEndMarker ? undefined : `url(#arrow-${id})`}
      />
      {fullLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              zIndex: EDGE_LABEL_Z_INDEX,
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              padding: '0 12px',
              borderRadius: euiTheme.border.radius.medium,
              fontFamily: euiTheme.font.familyCode,
              fontSize: 11,
              fontWeight: 400,
              lineHeight: '20px',
              background: euiTheme.colors.backgroundBasePlain,
              border: `1px solid ${euiTheme.colors.borderBaseProminent}`,
              color: euiTheme.colors.textParagraph,
              whiteSpace: 'nowrap',
            }}
          >
            <EuiToolTip content={fullLabel} position="top">
              {/* eslint-disable-next-line @elastic/eui/tooltip-focusable-anchor */}
              <span>{truncated}</span>
            </EuiToolTip>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

function edgePropsAreEqual(prev: EdgeProps, next: EdgeProps): boolean {
  if (
    prev.sourceX !== next.sourceX ||
    prev.sourceY !== next.sourceY ||
    prev.targetX !== next.targetX ||
    prev.targetY !== next.targetY ||
    prev.sourcePosition !== next.sourcePosition ||
    prev.targetPosition !== next.targetPosition
  )
    return false;
  const pd = prev.data as WorkflowEdgeData | undefined;
  const nd = next.data as WorkflowEdgeData | undefined;
  return (
    pd?.traversed === nd?.traversed &&
    pd?.label === nd?.label &&
    pd?.points === nd?.points &&
    pd?.branchType === nd?.branchType &&
    pd?.isMerge === nd?.isMerge &&
    pd?.hideEndMarker === nd?.hideEndMarker
  );
}

export const WorkflowGraphEdge = memo(WorkflowGraphEdgeInner, edgePropsAreEqual);
