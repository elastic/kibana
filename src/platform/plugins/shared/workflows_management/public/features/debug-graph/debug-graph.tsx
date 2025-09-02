/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import dagre from '@dagrejs/dagre';
import { convertToWorkflowGraph } from '@kbn/workflows/graph';
import type { NodeTypes, Node } from '@xyflow/react';
import { Background, Controls, Position, ReactFlow } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import { WORKFLOW_ZOD_SCHEMA_LOOSE } from '../../../common/schema';
import { parseWorkflowYamlToJSON } from '../../../common/lib/yaml_utils';
import { WorkflowGraphEdge, WorkflowGraphNode } from './nodes';
import {
  mainScopeNodes,
  secondaryScopeNodes,
  atomicNodes,
  openScopeNodes,
  closeScopeNodes,
} from './nodes/types';

import '@xyflow/react/dist/style.css';

export interface WorkflowExecutionProps {
  workflowYaml: string | undefined;
}

const nodeTypes = [...mainScopeNodes, ...secondaryScopeNodes, ...atomicNodes].reduce(
  (acc, nodeType) => {
    acc[nodeType] = WorkflowGraphNode;
    return acc;
  },
  {} as Record<string, React.FC<any>>
);
const edgeTypes = {
  default: WorkflowGraphEdge,
  workflowEdge: WorkflowGraphEdge,
};

function applyLayout(graph: dagre.graphlib.Graph) {
  const topologySort = dagre.graphlib.alg.topsort(graph);
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setGraph({});
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Set graph direction and spacing
  dagreGraph.setGraph({
    rankdir: 'BT', // Bottom-to-Top direction (reversed)
    nodesep: 40,
    ranksep: 40,
    edgesep: 40,
    // align: 'UL', // Align nodes to Upper-Left within their ranks
    marginx: 20,
    marginy: 20,
  });

  const stack = [] as string[];
  const baseWidth = 300;
  let maxDepth = 0;

  topologySort
    .map((nodeId) => graph.node(nodeId))
    .forEach((node: any) => {
      if (closeScopeNodes.includes(node.type)) {
        stack.pop();
      }

      dagreGraph.setNode(node.id, {
        node,
        type: (node as any).type,
        currentDepth: stack.length,
      });
      if (stack.length > maxDepth) {
        maxDepth = stack.length;
      }
      if (openScopeNodes.includes(node.type)) {
        stack.push(node.type);
      }
    });
  dagreGraph
    .nodes()
    .map((id) => ({ id, node: dagreGraph.node(id) as any }))
    .forEach((x) =>
      dagreGraph.setNode(x.id, {
        ...x.node,
        width:
          x.node.currentDepth === maxDepth
            ? baseWidth
            : baseWidth + (maxDepth - x.node.currentDepth) * 70,
        height: 50,
      })
    );

  graph.edges().forEach((edge) => {
    // Reverse source and destination for BT layout
    dagreGraph.setEdge(edge.w, edge.v, {
      type: 'workflowEdge',
    });
  });

  dagre.layout(dagreGraph);

  const nodes = graph.nodes().map((id) => {
    const dagreNode = dagreGraph.node(id);
    const graphNode = graph.node(id) as any;
    return {
      id,
      data: {
        ...dagreGraph.node(id),
        stepType: graphNode?.type,
        step: graphNode?.configuration,
        label: graphNode?.label || id,
      },
      // See this: https://github.com/dagrejs/dagre/issues/287
      targetPosition: Position.Bottom, // Reversed due to BT layout
      sourcePosition: Position.Top, // Reversed due to BT layout
      style: {
        width: dagreNode.width as number,
        height: dagreNode.height as number,
      },
      type: graphNode.type,
      position: { x: dagreNode.x - dagreNode.width / 2, y: dagreNode.y - dagreNode.height / 2 },
    } as Node;
  });

  const edges = graph.edges().map((e) => ({
    id: `${e.v} -> ${e.w}`,
    source: e.v,
    target: e.w,
    label: graph.edge(e)?.label,
  }));
  return { nodes, edges };
}

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
      onError={(error) => {
        // eslint-disable-next-line no-console
        console.error('ReactFlow error:', error);
      }}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
};

export const DebugGraph: React.FC<WorkflowExecutionProps> = ({ workflowYaml }) => {
  const { euiTheme } = useEuiTheme();

  const workflowExecutionGraph: { result: any; error: any } | null = useMemo(() => {
    if (!workflowYaml) {
      return null;
    }
    let result = null;
    let error = null;
    try {
      const parsingResult = parseWorkflowYamlToJSON(workflowYaml, WORKFLOW_ZOD_SCHEMA_LOOSE);
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
      result = applyLayout(workflowExecutionGraph.result);
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
            height: '600px',
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
