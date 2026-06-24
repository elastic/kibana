/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import React, { memo } from 'react';
import { EDGE_STROKE_DEFAULT } from './workflow_graph_edge';

/**
 * Invisible placeholder node rendered for the missing branch of an `if` step
 * that has only one branch present. Its sole purpose is to give dagre a node
 * to place in the empty lane so the graph renders as a balanced fan-out /
 * fan-in diamond.
 *
 * The React Flow node wrapper has a real rendered height H (determined by the
 * two handles). A 1px vertical bridge line spans top→bottom to fill the gap
 * between the fork edge's endpoint (top handle) and the merge edge's start
 * (bottom handle), making the false lane appear continuous regardless of H.
 */
function WorkflowGraphBranchPlaceholderNodeInner(props: NodeProps) {
  const { targetPosition = Position.Top, sourcePosition = Position.Bottom } = props;

  return (
    <>
      <Handle type="target" position={targetPosition} style={{ opacity: 0 }} />
      {/* Bridge line: spans the full node height so the fork→merge gap is filled */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: -10,
          bottom: 0,
          height: 12,
          width: 1,
          transform: 'translateX(-50%)',
          background: EDGE_STROKE_DEFAULT,
          pointerEvents: 'none',
        }}
      />
      <Handle type="source" position={sourcePosition} style={{ opacity: 0 }} />
    </>
  );
}

export const WorkflowGraphBranchPlaceholderNode = memo(WorkflowGraphBranchPlaceholderNodeInner);
