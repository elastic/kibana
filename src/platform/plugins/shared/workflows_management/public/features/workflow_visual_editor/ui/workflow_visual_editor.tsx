/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, useResizeObserver } from '@elastic/eui';
import type { ColorMode, NodeTypes, ReactFlowInstance } from '@xyflow/react';
import { Background, Controls, ReactFlow } from '@xyflow/react';
import React, { useEffect, useMemo, useRef } from 'react';
import type { WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import '@xyflow/react/dist/style.css';
import { WorkflowGraphEdge } from './workflow_edge';
import { WorkflowGraphNode } from './workflow_node';
import { getLayoutedNodesAndEdges } from '../lib/get_layouted_nodes_and_edges';

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
  const { colorMode, euiTheme } = useEuiTheme();
  // TODO: call fitView(), when container is resized
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
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
          reactFlowInstanceRef.current = instance as ReactFlowInstance;
        }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes as unknown as NodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 1 }}
        proOptions={{
          hideAttribution: true,
        }}
        colorMode={colorMode.toLowerCase() as ColorMode}
      >
        <Controls orientation="horizontal" />
        <Background
          bgColor={euiTheme.colors.backgroundBasePlain}
          color={euiTheme.colors.textSubdued}
        />
      </ReactFlow>
    </div>
  );
}
