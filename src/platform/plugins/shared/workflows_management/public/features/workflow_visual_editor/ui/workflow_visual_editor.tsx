/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import type { NodeTypes, ReactFlowInstance } from '@xyflow/react';
import { Background, Controls, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useEffect, useMemo, useRef } from 'react';
import { useResizeObserver } from '@elastic/eui';
import { getLayoutedNodesAndEdges } from '../lib/get_layouted_nodes_and_edges';
import { WorkflowGraphEdge } from './workflow_edge';
import { WorkflowGraphNode } from './workflow_node';

const nodeTypes = {
  trigger: WorkflowGraphNode,
  if: WorkflowGraphNode,
  merge: WorkflowGraphNode,
  parallel: WorkflowGraphNode,
  action: WorkflowGraphNode,
  foreach: WorkflowGraphNode,
  atomic: WorkflowGraphNode,
};
const edgeTypes = {
  workflowEdge: WorkflowGraphEdge,
};

export function WorkflowVisualEditor({
  workflow,
  stepExecutions,
}: {
  workflow: WorkflowYaml;
  stepExecutions?: WorkflowStepExecutionDto[];
}) {
  // TODO: call fitView(), when container is resized
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance<any, any> | null>(null);
  const dimensions = useResizeObserver(containerRef.current);

  useEffect(() => {
    if (reactFlowInstanceRef.current) {
      reactFlowInstanceRef.current.fitView({
        padding: 1,
        maxZoom: 1,
        minZoom: 0.5,
      });
    }
  }, [dimensions]);

  const { nodes: initialNodes, edges: initialEdges } = getLayoutedNodesAndEdges(workflow);

  const stepExecutionMap = useMemo(() => {
    if (!stepExecutions) {
      return null;
    }
    return stepExecutions?.reduce((acc, stepExecution) => {
      acc[stepExecution.stepId] = stepExecution;
      return acc;
    }, {} as Record<string, WorkflowStepExecutionDto>);
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
    <div ref={containerRef} css={{ height: '100%', width: '100%' }}>
      <ReactFlow
        onInit={(instance) => {
          reactFlowInstanceRef.current = instance;
        }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes as any as NodeTypes}
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
    </div>
  );
}
