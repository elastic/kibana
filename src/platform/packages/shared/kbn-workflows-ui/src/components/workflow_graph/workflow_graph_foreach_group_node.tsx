/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, transparentize, useEuiShadow, useEuiTheme } from '@elastic/eui';
import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import React, { memo } from 'react';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { deslugifyStepName } from './deslugify_step_name';
import { resolveNodeChipStyle } from './resolve_node_chip_style';

interface ForeachGroupNodeData extends Record<string, unknown> {
  readonly label: string;
  /** The original step type (e.g. `'foreach'`, `'while'`). */
  readonly stepType: string;
  /** Optional execution status threaded through from the canvas. */
  readonly stepExecution?: WorkflowStepExecutionDto;
}

function WorkflowGraphForeachGroupNodeInner(node: NodeProps<Node<ForeachGroupNodeData>>) {
  const { label, stepType, stepExecution } = node.data;
  const { euiTheme } = useEuiTheme();
  const { colors } = euiTheme;
  // TODO: switch to xxs when available
  const nodeShadow = useEuiShadow('xs', { border: 'none' });
  const displayLabel = deslugifyStepName(label);
  const targetHandlePos = node.targetPosition ?? Position.Top;
  const sourceHandlePos = node.sourcePosition ?? Position.Bottom;

  const execStatus = stepExecution?.status;
  const isSuccess = execStatus === ExecutionStatus.COMPLETED;
  const isFailed =
    execStatus === ExecutionStatus.FAILED ||
    execStatus === ExecutionStatus.TIMED_OUT ||
    execStatus === ExecutionStatus.CANCELLED;

  const chip = resolveNodeChipStyle(euiTheme, stepType, false, { isSuccess, isFailed });
  const panelBorder = isSuccess
    ? colors.success
    : isFailed
    ? colors.danger
    : colors.borderBasePlain;
  const borderRadius = euiTheme.border.radius.small;

  return (
    <>
      <Handle type="target" position={targetHandlePos} style={{ opacity: 0 }} />
      <div
        css={[
          {
            width: '100%',
            height: '100%',
            background: transparentize(colors.backgroundBasePlain, 0.5),
            border: `${euiTheme.border.width.thin} solid ${panelBorder}`,
            borderRadius,
            position: 'relative',
            transition: 'border-color 120ms ease',
          },
          nodeShadow,
        ]}
      >
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: euiTheme.size.s,
            padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
            fontFamily: euiTheme.font.family,
            fontSize: 12,
            fontWeight: 500,
            color: colors.textHeading,
            lineHeight: '24px',
          }}
        >
          <div
            css={{
              flex: '0 0 auto',
              width: 28,
              height: 28,
              background: chip.background,
              border: `1px solid ${chip.border}`,
              borderRadius,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 120ms ease, border-color 120ms ease',
            }}
          >
            <EuiIcon type="refresh" size="m" color={chip.iconColor} aria-hidden />
          </div>
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
