/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { convertToWorkflowGraph } from '@kbn/workflows/graph';
import type { NodeTypes, Node } from '@xyflow/react';
import { Background, Controls, ReactFlow } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import { getWorkflowZodSchemaLoose } from '../../../common/schema';
import { parseWorkflowYamlToJSON } from '../../../common/lib/yaml_utils';
import { ExecutionGraphEdge, ExecutionGraphNode } from './nodes';
import { convertWorkflowGraphToReactFlow } from './workflow_graph_layout';
import { mainScopeNodes, secondaryScopeNodes, atomicNodes } from './nodes/types';

import '@xyflow/react/dist/style.css';

export interface ExecutionGraphProps {
  workflowYaml: string | undefined;
}

const nodeTypes = [...mainScopeNodes, ...secondaryScopeNodes, ...atomicNodes].reduce(
  (acc, nodeType) => {
    acc[nodeType] = ExecutionGraphNode;
    return acc;
  },
  {} as Record<string, React.FC<any>>
);
const edgeTypes = {
  default: ExecutionGraphEdge,
  workflowEdge: ExecutionGraphEdge,
};

// Wrapper component to handle ReactFlow initialization timing
const ReactFlowWrapper: React.FC<{
  nodes: Node[];
  edges: any[];
  nodeTypesMap: any;
  edgeTypesMap: any;
}> = ({ nodes, edges, nodeTypesMap, edgeTypesMap }) => {
  const [isReady, setIsReady] = React.useState(false);

  // Use a small delay to ensure ReactFlow is properly initialized
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 50); // Small delay to ensure proper initialization

    return () => clearTimeout(timer);
  }, [nodes, edges]);

  const onInit = React.useCallback((reactFlowInstance: any) => {
    // Fit view once the instance is ready
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.1 });
    }, 100);
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypesMap}
      edgeTypes={edgeTypesMap}
      onInit={onInit}
      fitView={isReady}
      fitViewOptions={{ padding: 0.1 }}
      proOptions={{
        hideAttribution: true,
      }}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
};

export const ExecutionGraph: React.FC<ExecutionGraphProps> = ({ workflowYaml }) => {
  const { euiTheme } = useEuiTheme();

  const workflowExecutionGraph: { result: any; error: any } | null = useMemo(() => {
    if (!workflowYaml) {
      return null;
    }
    let result = null;
    let error = null;
    try {
      const parsingResult = parseWorkflowYamlToJSON(workflowYaml, getWorkflowZodSchemaLoose());
      if (parsingResult.error) {
        error = parsingResult.error;
      }
      result = convertToWorkflowGraph((parsingResult as { data: any }).data);
    } catch (e) {
      error = e;
    }

    return { result, error };
  }, [workflowYaml]);

  const layoutResult: { result: any; error: string } | null = useMemo(() => {
    if (!workflowExecutionGraph) {
      return null;
    }

    if (workflowExecutionGraph.error) {
      return { result: null, error: workflowExecutionGraph.error };
    }

    let result = null;
    let error = null;
    try {
      result = convertWorkflowGraphToReactFlow(workflowExecutionGraph.result);
    } catch (e) {
      error = e.message;
    }
    return { result, error };
  }, [workflowExecutionGraph]);

  return (
    <>
      {layoutResult?.error && (
        <div style={{ color: euiTheme.colors.danger }}>
          Error generating graph layout: {String(layoutResult.error)}
        </div>
      )}
      {layoutResult?.result && (
        <div
          style={{
            width: '100%',
            height: '100%',
            border: `1px solid ${euiTheme.border.color}`,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              backgroundColor: euiTheme.colors.emptyShade,
              padding: 5,
              zIndex: 10,
            }}
          >
            Nodes: {layoutResult.result.nodes.length}, Edges: {layoutResult.result.edges.length}
          </div>
          <ReactFlowWrapper
            nodes={layoutResult.result.nodes}
            edges={layoutResult.result.edges}
            nodeTypesMap={nodeTypes as any as NodeTypes}
            edgeTypesMap={edgeTypes}
          />
        </div>
      )}
      {!layoutResult && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}
        >
          No valid workflow graph to display!
        </div>
      )}
    </>
  );
};
