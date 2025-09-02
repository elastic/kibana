/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */
import React, { useMemo } from 'react';
import dagre from '@dagrejs/dagre';
import { convertToWorkflowGraph } from '@kbn/workflows/graph';
import type { NodeTypes, Node } from '@xyflow/react';
import { Background, Controls, Position, ReactFlow } from '@xyflow/react';
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
  workflowYaml: string;
}

const nodeTypes = [...mainScopeNodes, ...secondaryScopeNodes, ...atomicNodes].reduce(
  (acc, nodeType) => {
    acc[nodeType] = WorkflowGraphNode;
    return acc;
  },
  {} as Record<string, React.FC<any>>
);
const edgeTypes = {
  workflowEdge: WorkflowGraphEdge,
};

function applyLayout(graph: dagre.graphlib.Graph) {
  const topologySort = dagre.graphlib.alg.topsort(graph);
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setGraph({});
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Set graph direction and spacing
  dagreGraph.setGraph({
    rankdir: 'TB',
    nodesep: 40,
    ranksep: 40,
    edgesep: 40,
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

  graph.edges().forEach((edge) => dagreGraph.setEdge(edge.v, edge.w));

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
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
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

  console.log('Edges in graph:', edges);
  return { nodes, edges };
}

export const DebugGraph: React.FC<WorkflowExecutionProps> = ({ workflowYaml }) => {
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
      result = convertToWorkflowGraph(parsingResult.data as any);
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
        <div style={{ color: 'red' }}>
          Error generating graph layout: {String(layoutResult.error)}
        </div>
      )}
      {layoutResult?.result && (
        <div
          style={{ width: '100%', height: '600px', border: '1px solid #ddd', position: 'relative' }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              backgroundColor: 'white',
              padding: 5,
              zIndex: 10,
            }}
          >
            Nodes: {layoutResult.result.nodes.length}, Edges: {layoutResult.result.edges.length}
          </div>
          <ReactFlow
            nodes={layoutResult.result.nodes}
            edges={layoutResult.result.edges}
            fitViewOptions={{ padding: 1 }}
            nodeTypes={nodeTypes as any as NodeTypes}
            edgeTypes={edgeTypes}
            proOptions={{
              hideAttribution: true,
            }}
            fitView
            onError={(error) => console.error('ReactFlow error:', error)}
          >
            <Background />
            <Controls />
          </ReactFlow>
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
