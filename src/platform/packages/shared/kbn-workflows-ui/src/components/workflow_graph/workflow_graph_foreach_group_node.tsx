/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, transparentize, useEuiTheme } from '@elastic/eui';
import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import React, { memo } from 'react';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { deslugifyStepName } from './deslugify_step_name';

interface ForeachGroupNodeData extends Record<string, unknown> {
  readonly label: string;
  /** The original step type (e.g. `'foreach'`, `'while'`). */
  readonly stepType: string;
  /** Optional execution status threaded through from the canvas. */
  readonly stepExecution?: WorkflowStepExecutionDto;
}

function WorkflowGraphForeachGroupNodeInner(node: NodeProps<Node<ForeachGroupNodeData>>) {
  const { label, stepExecution } = node.data;
  const { euiTheme } = useEuiTheme();
  const { colors } = euiTheme;
  // Display-only, mirrors workflow_graph_node.tsx: `label` itself must stay
  // untouched since it's used to key execution status.
  const displayLabel = deslugifyStepName(label);
  const targetHandlePos = node.targetPosition ?? Position.Top;
  const sourceHandlePos = node.sourcePosition ?? Position.Bottom;

  const execStatus = stepExecution?.status;
  const isSuccess = execStatus === ExecutionStatus.COMPLETED;
  const isFailed =
    execStatus === ExecutionStatus.FAILED ||
    execStatus === ExecutionStatus.TIMED_OUT ||
    execStatus === ExecutionStatus.CANCELLED;

  // Match the regular step card (workflow_graph_node.tsx): the same Borealis
  // tokens for the tinted border + header pane, `primary` icon, and flat look.
  const borderColor = isSuccess
    ? colors.success
    : isFailed
    ? colors.danger
    : colors.backgroundLightPrimary;
  const headerBg = isSuccess
    ? colors.backgroundBaseSuccess
    : isFailed
    ? colors.backgroundBaseDanger
    : colors.backgroundLightPrimary;
  const iconColor = isSuccess ? colors.success : isFailed ? colors.danger : colors.primary;

  return (
    <>
      <Handle type="target" position={targetHandlePos} style={{ opacity: 0 }} />
      <div
        css={{
          width: '100%',
          height: '100%',
          // Semi-transparent white body (50%) so the canvas dot pattern shows
          // through softly; token-based so it adapts to dark mode.
          background: transparentize(colors.backgroundBasePlain, 0.5),
          border: `1px solid ${borderColor}`,
          borderRadius: 10,
          position: 'relative',
          transition: 'border-color 120ms ease',
        }}
      >
        {/* Full-width header with refresh icon + label. Sized to match
            GROUP_PADDING_TOP in apply_graph_layout.ts so inner nodes sit
            just below the header. */}
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '8px 16px',
            background: headerBg,
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
            borderBottom: `1px solid ${borderColor}`,
            fontFamily: euiTheme.font.family,
            fontSize: 12,
            fontWeight: 500,
            color: colors.textHeading,
            lineHeight: '24px',
            transition: 'background 120ms ease',
          }}
        >
          <EuiIcon type="refresh" size="m" color={iconColor} aria-hidden />
          <span
            css={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}
            title={displayLabel}
          >
            {displayLabel}
          </span>
        </div>
      </div>
      <Handle type="source" position={sourceHandlePos} style={{ opacity: 0 }} />
    </>
  );
}

export const WorkflowGraphForeachGroupNode = memo(WorkflowGraphForeachGroupNodeInner);
