/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dagre from '@dagrejs/dagre';
import type { Node } from '@xyflow/react';
import { Position } from '@xyflow/react';
import { openScopeNodes, closeScopeNodes } from './nodes/types';

/**
 * Converts a workflow graph into positioned ReactFlow nodes and edges using Dagre layout algorithm.
 *
 * @param graph - The dagre graph representation of the workflow
 * @returns Object containing positioned nodes and edges for ReactFlow
 */
export function convertWorkflowGraphToReactFlow(graph: dagre.graphlib.Graph) {
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
    marginx: 20,
    marginy: 20,
  });

  const stack = [] as string[];
  const baseWidth = 100;
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
        ...dagreNode,
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
