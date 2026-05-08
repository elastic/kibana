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
}

const LABEL_TRUNCATE = 24;

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

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const traversed = edgeData?.traversed ?? false;
  const traversedVisual = traversed
    ? getExecutionStatusVisual(euiTheme, edgeData?.traversedStatus ?? ExecutionStatus.COMPLETED)
    : null;
  const stroke = traversedVisual?.color ?? euiTheme.colors.borderBaseSubdued;
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
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 11,
              background: euiTheme.colors.backgroundBasePlain,
              border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
              color: euiTheme.colors.textSubdued,
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
