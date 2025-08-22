/* eslint-disable no-console */
import React, { useMemo } from 'react';
import dagre from '@dagrejs/dagre';
import { convertToWorkflowGraph } from '@kbn/workflows/graph';
import type { ConnectorContract } from '@kbn/workflows';
import { generateYamlSchemaFromConnectors, EnterForeachNode } from '@kbn/workflows';
import type { NodeTypes } from '@xyflow/react';
import { Background, Controls, Position, ReactFlow, Node } from '@xyflow/react';
import { z } from '@kbn/zod';
import { parseWorkflowYamlToJSON } from './yaml_utils';
import { WorkflowGraphEdge, WorkflowGraphNode } from './nodes';
import '@xyflow/react/dist/style.css';

const connectors: ConnectorContract[] = [
  {
    type: 'console',
    paramsSchema: z
      .object({
        message: z.string(),
      })
      .required(),
    outputSchema: z.string(),
  },
  {
    type: 'slack',
    connectorIdRequired: true,
    paramsSchema: z
      .object({
        message: z.string(),
      })
      .required(),
    outputSchema: z.object({
      message: z.string(),
    }),
  },
  {
    type: 'inference.unified_completion',
    connectorIdRequired: true,
    paramsSchema: z
      .object({
        body: z.object({
          messages: z.array(
            z.object({
              role: z.string(),
              content: z.string(),
            })
          ),
        }),
      })
      .required(),
    // TODO: use UnifiedChatCompleteResponseSchema from stack_connectors/common/inference/schema.ts
    outputSchema: z.object({
      id: z.string(),
      choices: z.array(
        z.object({
          message: z.object({
            content: z.string(),
            role: z.string(),
          }),
        })
      ),
    }),
  },
  {
    type: 'inference.completion',
    connectorIdRequired: true,
    paramsSchema: z.object({
      input: z.string(),
    }),
    outputSchema: z.array(
      z.object({
        result: z.string(),
      })
    ),
  },
];

export interface WorkflowExecutionProps {
  workflowYaml: string;
}

const nodeTypes = {
  trigger: WorkflowGraphNode,
  if: WorkflowGraphNode,
  merge: WorkflowGraphNode,
  parallel: WorkflowGraphNode,
  action: WorkflowGraphNode,
  foreach: WorkflowGraphNode,
  'enter-foreach': WorkflowGraphNode,
  'exit-foreach': WorkflowGraphNode,
  atomic: WorkflowGraphNode,
};
const edgeTypes = {
  workflowEdge: WorkflowGraphEdge,
};

function applyLayout(graph: dagre.graphlib.Graph) {
  const nnnids = graph.nodes().map((id) => graph.node(id));
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

  graph.nodes().forEach((node) =>
    dagreGraph.setNode(node, {
      node: graph.node(node),
      type: (graph.node(node) as any).type,
      width: 200,
      height: 50,
    })
  );
  graph.edges().forEach((edge) => dagreGraph.setEdge(edge.v, edge.w));

  dagre.layout(dagreGraph);
  const dagrenodestopsort = dagre.graphlib.alg.topsort(dagreGraph);
  const dagreNodes = dagrenodestopsort.map((id) => dagreGraph.node(id));
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
//   console.log(
//     'Node types in graph:',
//     nodes.map((node) => ({ id: node.id, type: node.type }))
//   );
  console.log('Edges in graph:', edges);
  return { nodes, edges };
}

export const DebugGraph: React.FC<WorkflowExecutionProps> = ({ workflowYaml }) => {
  const workflowExecutionGraph = useMemo(() => {
    if (!workflowYaml) {
      return null;
    }
    const result = parseWorkflowYamlToJSON(
      workflowYaml,
      generateYamlSchemaFromConnectors(connectors, true)
    );
    console.log('DebugGraph result', result);
    if (result.error) {
      return null;
    }
    const sch = convertToWorkflowGraph(result.data as any);
    console.log('DebugGraph', sch);
    return sch;
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
          No valid workflow graph to display
        </div>
      )}
    </>
  );
};
