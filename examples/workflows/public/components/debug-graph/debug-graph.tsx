/* eslint-disable no-console */
import React, { useMemo } from 'react';
import dagre from '@dagrejs/dagre';
import { convertToWorkflowGraph } from '@kbn/workflows/graph';
import type { NodeTypes, Node } from '@xyflow/react';
import { Background, Controls, Position, ReactFlow } from '@xyflow/react';
import {
  WORKFLOW_ZOD_SCHEMA_LOOSE,
  parseWorkflowYamlToJSON,
} from '@kbn/workflows-management-plugin/public';
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
  topologySort
    .map((nodeId) => graph.node(nodeId))
    .forEach((node: any) => {
      if (closeScopeNodes.includes(node.type)) {
        stack.pop();
      }
      const baseWidth = 400;

      dagreGraph.setNode(node.id, {
        node,
        type: (node as any).type,
        width: baseWidth - stack.length * 70,
        height: 50,
      });
      if (openScopeNodes.includes(node.type)) {
        stack.push(node.type);
      }
    });

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
  const workflowExecutionGraph = useMemo(() => {
    if (!workflowYaml) {
      return null;
    }
    const result = parseWorkflowYamlToJSON(workflowYaml, WORKFLOW_ZOD_SCHEMA_LOOSE);
    if (result.error) {
      console.error(result.error);
      return null;
    }

    try {
      return convertToWorkflowGraph(result.data as any);
    } catch (error) {
      console.error('Error converting workflow YAML to graph:', error);
    }
  }, [workflowYaml]);

  const layout = useMemo(() => {
    if (!workflowExecutionGraph) {
      return null;
    }
    return applyLayout(workflowExecutionGraph);
  }, [workflowExecutionGraph]);

  return (
    <>
      {layout && (
        <div style={{ width: '100%', height: '600px', border: '1px solid #ddd' }}>
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
            Nodes: {layout.nodes.length}, Edges: {layout.edges.length}
          </div>
          <ReactFlow
            nodes={layout.nodes}
            edges={layout.edges}
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
      {!layout && (
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
