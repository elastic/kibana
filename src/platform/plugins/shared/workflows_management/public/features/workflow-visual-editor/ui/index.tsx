/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { ReactFlow, Controls, Background, NodeTypes } from '@xyflow/react';
import { EsWorkflowStepExecution, WorkflowYaml } from '@kbn/workflows';
import { getLayoutedNodesAndEdges } from '../lib/get_layouted_nodes_and_edges';
import { WorkflowGraphNode } from './WorkflowNode';
import { WorkflowGraphEdge } from './WorkflowEdge';
import '@xyflow/react/dist/style.css';

const nodeTypes: NodeTypes = {
  trigger: WorkflowGraphNode,
  if: WorkflowGraphNode,
  merge: WorkflowGraphNode,
  parallel: WorkflowGraphNode,
  action: WorkflowGraphNode,
  foreach: WorkflowGraphNode,
  atomic: WorkflowGraphNode,
  action: WorkflowGraphNode,
};
const edgeTypes = {
  workflowEdge: WorkflowGraphEdge,
};

export function WorkflowVisualEditor({
  workflow,
  stepExecutions,
}: {
  workflow: WorkflowYaml;
  stepExecutions?: EsWorkflowStepExecution[];
}) {
  const { nodes: initialNodes, edges: initialEdges } = getLayoutedNodesAndEdges(workflow);

  const stepExecutionMap = useMemo(() => {
    if (!stepExecutions) {
      return null;
    }
    return stepExecutions?.reduce((acc, stepExecution) => {
      acc[stepExecution.stepId] = stepExecution;
      return acc;
    }, {} as Record<string, EsWorkflowStepExecution>);
  }, [stepExecutions]);

  const { nodes, edges } = useMemo(() => {
    if (!stepExecutionMap) {
      return { nodes: initialNodes, edges: initialEdges };
    }
    const finalNodes = initialNodes.map((node) => {
      if (stepExecutionMap[node.data.label]) {
        return {
          ...node,
          data: {
            ...node.data,
            stepExecution: stepExecutionMap[node.data.label],
          },
        };
      }
      return node;
    });
    return { nodes: finalNodes, edges: initialEdges };
  }, [initialNodes, initialEdges, stepExecutionMap]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 1 }}
      proOptions={{
        hideAttribution: true,
      }}
    >
      <Controls orientation="horizontal" />
      <Background bgColor="#F7F8FC" color="#CAD3E2" />
    </ReactFlow>
  );
}
