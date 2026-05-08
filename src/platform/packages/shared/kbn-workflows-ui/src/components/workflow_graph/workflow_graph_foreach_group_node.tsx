/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize, useEuiTheme } from '@elastic/eui';
import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import React from 'react';
import { i18n } from '@kbn/i18n';

interface ForeachGroupNodeData extends Record<string, unknown> {
  label: string;
  stepType: 'foreach';
}

export function WorkflowGraphForeachGroupNode(node: NodeProps<Node<ForeachGroupNodeData>>) {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        css={{
          width: '100%',
          height: '100%',
          background: transparentize(euiTheme.colors.warning, 0.04),
          border: `1px dashed ${euiTheme.colors.warning}`,
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
            background: euiTheme.colors.backgroundBasePlain,
            padding: '0 6px',
            fontSize: 12,
            fontWeight: 600,
            color: euiTheme.colors.warning,
          }}
        >
          {`${node.data.label} · ${i18n.translate('workflowsUi.graph.foreachLabel', {
            defaultMessage: 'for each item',
          })}`}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}
