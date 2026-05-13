/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import React from 'react';
import { i18n } from '@kbn/i18n';

// Matches the blue palette used by step nodes so the foreach container
// feels like a natural extension of the same visual language.
const FOREACH_BORDER = '#bfdbff';
const FOREACH_LABEL_BG = '#f1f6ff';
const FOREACH_LABEL_COLOR = '#006bb8';

interface ForeachGroupNodeData extends Record<string, unknown> {
  label: string;
  stepType: 'foreach';
}

export function WorkflowGraphForeachGroupNode(node: NodeProps<Node<ForeachGroupNodeData>>) {
  const { euiTheme } = useEuiTheme();
  const targetHandlePos = node.targetPosition ?? Position.Top;
  const sourceHandlePos = node.sourcePosition ?? Position.Bottom;
  return (
    <>
      <Handle type="target" position={targetHandlePos} style={{ opacity: 0 }} />
      <div
        css={{
          width: '100%',
          height: '100%',
          background: euiTheme.colors.backgroundBasePlain,
          border: `1px dashed ${FOREACH_BORDER}`,
          borderRadius: 12,
          padding: '24px 12px 12px',
          position: 'relative',
        }}
      >
        <div
          css={{
            position: 'absolute',
            top: -10,
            left: 12,
            background: FOREACH_LABEL_BG,
            border: `1px solid ${FOREACH_BORDER}`,
            borderRadius: 4,
            padding: '0 6px',
            fontSize: 12,
            fontWeight: 600,
            color: FOREACH_LABEL_COLOR,
          }}
        >
          {`${node.data.label} · ${i18n.translate('workflowsUi.graph.foreachLabel', {
            defaultMessage: 'for each item',
          })}`}
        </div>
      </div>
      <Handle type="source" position={sourceHandlePos} style={{ opacity: 0 }} />
    </>
  );
}
