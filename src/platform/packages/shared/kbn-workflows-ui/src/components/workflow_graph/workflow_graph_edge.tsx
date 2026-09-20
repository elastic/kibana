/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1".
 */

import { EuiToolTip, euiCanAnimate, useEuiShadow, useEuiTheme } from '@elastic/eui';
import { keyframes } from '@emotion/react';
import type { EdgeProps } from '@xyflow/react';
import { EdgeLabelRenderer } from '@xyflow/react';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import type { EdgeBranchType } from '@kbn/workflows';
import { computeEdgePath } from './compute_edge_path';
import { INSERT_LAYOUT_MS } from './use_insert_layout_animation';

const drawInStroke = keyframes({
  from: { strokeDashoffset: 1 },
  to: { strokeDashoffset: 0 },
});

interface WorkflowEdgeData extends Record<string, unknown> {
  readonly label?: string;
  readonly traversed?: boolean;
  readonly points?: ReadonlyArray<{ readonly x: number; readonly y: number }>;
  /** Switch bus routing marker — present on all case/default edges of a switch node. */
  readonly branchType?: EdgeBranchType;
  /**
   * True when the target has more than one incoming edge (fan-in). Routes the
   * edge on the merge bus (symmetric inverted-bus fan-in matching the
   * fork-bus fan-out) so 16px corners apply instead of xyflow smooth-step.
   */
  readonly isMerge?: boolean;
  /**
   * True when the target node is a synthetic placeholder — suppresses the
   * arrowhead so the in-edge and out-edge form one continuous line mid-lane.
   */
  readonly hideEndMarker?: boolean;
  /** Error route into an `on-failure.fallback` step: solid danger connector. */
  readonly isFailure?: boolean;
  /** Draw the stroke in when a step was just inserted (insert layout animation). */
  readonly drawIn?: boolean;
}

const LABEL_TRUNCATE = 24;

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
  return label;
}

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
    points: edgeData?.points,
    branchType: edgeData?.branchType,
    isMerge: edgeData?.isMerge,
    isFailure: edgeData?.isFailure,
  });

  const traversed = edgeData?.traversed ?? false;
  const isFailure = edgeData?.isFailure ?? false;
  const drawIn = edgeData?.drawIn ?? false;
  const stroke = isFailure
    ? euiTheme.colors.danger
    : traversed
    ? euiTheme.colors.success
    : euiTheme.colors.borderBaseProminent;
  const strokeWidth = 1;

  const fullLabel = displayEdgeLabel(edgeData?.label ?? '');
  const truncated =
    fullLabel.length > LABEL_TRUNCATE ? `${fullLabel.slice(0, LABEL_TRUNCATE - 1)}…` : fullLabel;
  // true/false pills live under the if-node ports — suppress the mid-edge copies.
  const rawLabel = edgeData?.label ?? '';
  const showLabel = Boolean(fullLabel) && rawLabel !== 'true' && rawLabel !== 'false';

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
        style={{
          ...style,
          stroke,
          strokeWidth,
          fill: 'none',
        }}
        css={
          drawIn
            ? {
                strokeDasharray: 1,
                strokeDashoffset: 1,
                [euiCanAnimate]: {
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
                border: `1px solid ${
                  isFailure
                    ? euiTheme.colors.borderBaseDanger
                    : euiTheme.colors.borderBaseProminent
                }`,
                color: isFailure ? euiTheme.colors.textDanger : euiTheme.colors.textParagraph,
                whiteSpace: 'nowrap',
              },
              pillShadow,
            ]}
            data-test-subj={isFailure ? 'workflowGraphEdgeFailureLabel' : undefined}
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
    pd?.hideEndMarker === nd?.hideEndMarker &&
    pd?.isFailure === nd?.isFailure &&
    pd?.drawIn === nd?.drawIn
  );
}

export const WorkflowGraphEdge = memo(WorkflowGraphEdgeInner, edgePropsAreEqual);
