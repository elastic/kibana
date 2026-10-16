/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiCanAnimate, EuiToolTip, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { keyframes } from '@emotion/react';
import type { Edge, EdgeProps } from '@xyflow/react';
import { EdgeLabelRenderer } from '@xyflow/react';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { computeEdgePath } from './compute_edge_path';
import { EDGE_LABEL_MAX_CHARS } from './edge_label_metrics';
import { INSERT_LAYOUT_MS } from './use_insert_layout_animation';
import type { WorkflowEdgeData } from './workflow_node_data';

type WorkflowEdgeProps = EdgeProps<Edge<WorkflowEdgeData>>;

const drawInStroke = keyframes({
  from: { strokeDashoffset: 1 },
  to: { strokeDashoffset: 0 },
});

function displayEdgeLabel(label: string): string {
  if (label === 'true') {
    return i18n.translate('workflowsUi.graph.trueBranchLabel', { defaultMessage: 'true' });
  }
  if (label === 'false') {
    return i18n.translate('workflowsUi.graph.falseBranchLabel', { defaultMessage: 'false' });
  }
  if (label === 'on failure') {
    return i18n.translate('workflowsUi.graph.onFailureLabel', { defaultMessage: 'on failure' });
  }
  if (label === '') {
    return i18n.translate('workflowsUi.graph.emptyCaseLabel', { defaultMessage: '""' });
  }
  return label;
}

// Branch labels are annotations on the graph and must paint above the container
// frames they sit inside — a foreach/while body is a 50%-opaque panel that would
// otherwise veil them. `.react-flow__edgelabel-renderer` ships no z-index, and it
// is a sibling of `.react-flow__nodes` (which also has none), so labels tie with
// nodes at level 0 and lose on DOM order.
// Must exceed the deepest node z-index, which in `zIndexMode: 'basic'` with
// `elevateNodesOnSelect={false}` equals the container nesting depth.
const EDGE_LABEL_Z_INDEX = 10;

function WorkflowGraphEdgeInner(props: WorkflowEdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data: edgeData,
    style = {},
  } = props;
  const { euiTheme } = useEuiTheme();
  const pillShadow = useEuiShadow('xs', { border: 'none' });

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
    branchType: edgeData?.branchType,
    isMerge: edgeData?.isMerge,
    isFailure: edgeData?.isFailure,
    hideEndMarker: edgeData?.hideEndMarker,
  });

  const traversed = edgeData?.traversed ?? false;
  const isFailure = edgeData?.isFailure ?? false;
  const drawIn = edgeData?.drawIn ?? false;
  // Failure edges: always dashed; colour = danger when the lane has run, neutral
  // otherwise (ADR-0010 decision 9). All other edges: success when traversed.
  const stroke = isFailure
    ? traversed
      ? euiTheme.colors.danger
      : euiTheme.colors.borderBaseProminent
    : traversed
    ? euiTheme.colors.success
    : euiTheme.colors.borderBaseProminent;
  const strokeDasharray = isFailure ? '6 3' : undefined;
  const strokeWidth = 1;

  // Only call displayEdgeLabel when label is explicitly set — undefined means
  // "no label" and must not render the '""' empty-string chip.
  const rawLabel = edgeData?.label;
  const fullLabel = rawLabel !== undefined ? displayEdgeLabel(rawLabel) : '';
  const truncated =
    fullLabel.length > EDGE_LABEL_MAX_CHARS
      ? `${fullLabel.slice(0, EDGE_LABEL_MAX_CHARS - 1)}…`
      : fullLabel;
  const showLabel = Boolean(fullLabel);
  const isBranchEdge = edgeData?.branchType != null;

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
          <path d="M0,0 L0,6 L6,3 z" fill={stroke} />
        </marker>
      </defs>
      <path
        id={id}
        pathLength={drawIn ? 1 : undefined}
        style={{ ...style, stroke, strokeWidth, fill: 'none', strokeDasharray }}
        css={
          drawIn
            ? {
                // Only apply dash offset inside the animation media query so a
                // skipped/interrupted animation can never leave the stroke
                // permanently dashed-out (invisible).
                [euiCanAnimate]: {
                  strokeDasharray: 1,
                  strokeDashoffset: 1,
                  animation: `${drawInStroke} ${INSERT_LAYOUT_MS}ms ease-out forwards`,
                },
              }
            : undefined
        }
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={edgeData?.hideEndMarker ? undefined : `url(#arrow-${id})`}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              zIndex: EDGE_LABEL_Z_INDEX,
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            css={[
              {
                padding: '0 12px',
                borderRadius: euiTheme.size.l,
                fontFamily: euiTheme.font.familyCode,
                fontSize: 11,
                fontWeight: 400,
                lineHeight: '20px',
                background: isFailure
                  ? euiTheme.colors.backgroundBaseDanger
                  : euiTheme.colors.backgroundBasePlain,
                border: `1px ${isBranchEdge && !isFailure ? 'dashed' : 'solid'} ${
                  isFailure ? euiTheme.colors.borderBaseDanger : euiTheme.colors.borderBaseProminent
                }`,
                color: isFailure ? euiTheme.colors.textDanger : euiTheme.colors.textParagraph,
                whiteSpace: 'nowrap',
              },
              pillShadow,
            ]}
            data-test-subj={isFailure ? 'workflowGraphEdgeFailureLabel' : 'workflowGraphEdgeLabel'}
            data-label={fullLabel}
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

function edgePropsAreEqual(prev: WorkflowEdgeProps, next: WorkflowEdgeProps): boolean {
  if (
    prev.sourceX !== next.sourceX ||
    prev.sourceY !== next.sourceY ||
    prev.targetX !== next.targetX ||
    prev.targetY !== next.targetY ||
    prev.sourcePosition !== next.sourcePosition ||
    prev.targetPosition !== next.targetPosition
  )
    return false;
  const { data: pd } = prev;
  const { data: nd } = next;
  return (
    pd?.traversed === nd?.traversed &&
    pd?.label === nd?.label &&
    pd?.branchType === nd?.branchType &&
    pd?.isMerge === nd?.isMerge &&
    pd?.hideEndMarker === nd?.hideEndMarker &&
    pd?.isFailure === nd?.isFailure &&
    pd?.drawIn === nd?.drawIn
  );
}

export const WorkflowGraphEdge = memo(WorkflowGraphEdgeInner, edgePropsAreEqual);
