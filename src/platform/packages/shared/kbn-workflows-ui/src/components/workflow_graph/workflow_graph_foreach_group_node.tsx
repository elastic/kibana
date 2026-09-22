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
import { deslugifyStepName } from './deslugify_step_name';
import { resolveExecutionState, resolveNodeColors } from './workflow_graph_node';
import { getStepFamily, getStepIconType } from '../step_icons';

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
  // Display-only, mirrors workflow_graph_node.tsx: `label` itself must stay
  // untouched since it's used to key execution status.
  const displayLabel = deslugifyStepName(label);
  const targetHandlePos = node.targetPosition ?? Position.Top;
  const sourceHandlePos = node.sourcePosition ?? Position.Bottom;

  // Reuse the same execution-state + colour pipeline as regular step cards so
  // the container border and chip colours stay in sync (including CANCELLED
  // being neutral, matching the step-card behaviour).
  const family = getStepFamily(stepType, false);
  const execState = resolveExecutionState(stepExecution?.status);
  const { chip, cardBorderColor, stepLabelColor } = resolveNodeColors(euiTheme, family, execState);

  return (
    <>
      <Handle type="target" position={targetHandlePos} style={{ opacity: 0 }} />
      <div
        css={{
          width: '100%',
          height: '100%',
          // Semi-transparent white body (50%) so the canvas dot pattern shows
          // through softly; token-based so it adapts to dark mode.
          background: transparentize(euiTheme.colors.backgroundBasePlain, 0.5),
          border: `1px solid ${cardBorderColor}`,
          borderRadius: euiTheme.border.radius.medium,
          position: 'relative',
          transition: 'border-color 120ms ease',
        }}
      >
        {/* Transparent header row: icon chip + label. The header has no
            background so the canvas dot pattern remains visible behind it.
            Sized to match WORKFLOW_COMPOUND_PADDING.top in
            workflow_layout_pipeline.ts so inner nodes sit just below. */}
        <div
          data-test-subj="workflowGraphForeachGroupHeader"
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            // Asymmetric: chip sits 12px from the left edge, matching step
            // cards; right and vertical gutters are symmetric at 8px.
            padding: '8px 16px 8px 12px',
          }}
        >
          {/* Icon chip — 28×28, matching the step-card chip size. */}
          <div
            data-test-subj="workflowGraphForeachGroupChip"
            css={{
              flex: '0 0 auto',
              width: 28,
              height: 28,
              background: chip.fill,
              border: `1px solid ${chip.border}`,
              borderRadius: euiTheme.border.radius.small,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 120ms ease, border-color 120ms ease',
            }}
          >
            <EuiIcon type={getStepIconType(stepType)} size="m" color={chip.icon} aria-hidden />
          </div>
          <span
            css={{
              flex: '1 1 auto',
              fontFamily: euiTheme.font.family,
              fontSize: 12,
              fontWeight: 500,
              lineHeight: '24px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
              color: stepLabelColor,
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
