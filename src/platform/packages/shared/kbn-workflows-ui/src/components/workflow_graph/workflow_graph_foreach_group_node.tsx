/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, useEuiTheme } from '@elastic/eui';
import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';

interface ForeachGroupNodeData extends Record<string, unknown> {
  readonly label: string;
  readonly stepType: 'foreach';
}

function WorkflowGraphForeachGroupNodeInner(node: NodeProps<Node<ForeachGroupNodeData>>) {
  const { euiTheme } = useEuiTheme();
  const targetHandlePos = node.targetPosition ?? Position.Top;
  const sourceHandlePos = node.sourcePosition ?? Position.Bottom;
  // Match the step row's blue (accentSecondary) palette so the foreach
  // container reads as a natural wrapper for the steps it contains.
  const borderColor = euiTheme.colors.borderBaseAccentSecondary;
  const headerBg = euiTheme.colors.backgroundLightAccentSecondary;
  const labelColor = euiTheme.colors.accentSecondary;
  return (
    <>
      <Handle type="target" position={targetHandlePos} style={{ opacity: 0 }} />
      <div
        css={{
          width: '100%',
          height: '100%',
          // Lightly tinted so the foreach reads as a container without dominating
          // the steps inside.
          background: euiTheme.colors.backgroundLightAccentSecondary,
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Full-width header — same blue palette as step rows so the container
            visually owns the steps below it. Sized to match GROUP_PADDING_TOP
            (apply_graph_layout.ts) so inner nodes sit just below the header. */}
        <div
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: headerBg,
            borderBottom: `1px solid ${borderColor}`,
            fontFamily: euiTheme.font.family,
            fontSize: 12,
            fontWeight: 500,
            color: labelColor,
            lineHeight: '20px',
          }}
        >
          <EuiIcon type="refresh" size="s" color={labelColor} aria-hidden />
          <span>
            {`${node.data.label} · ${i18n.translate('workflowsUi.graph.foreachLabel', {
              defaultMessage: 'for each item',
            })}`}
          </span>
        </div>
      </div>
      <Handle type="source" position={sourceHandlePos} style={{ opacity: 0 }} />
    </>
  );
}

export const WorkflowGraphForeachGroupNode = memo(WorkflowGraphForeachGroupNodeInner);
