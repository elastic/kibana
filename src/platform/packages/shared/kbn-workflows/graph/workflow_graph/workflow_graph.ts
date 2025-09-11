/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import type { GraphNode } from '../../types/execution';
import { convertToWorkflowGraph } from '../build_execution_graph/build_execution_graph';

export class WorkflowGraph {
  private graph: graphlib.Graph | null = null;
  private __topologicalOrder: string[] | null = null;

  public static fromWorkflowDefinition(workflowDefinition: any): WorkflowGraph {
    const workflowGraph = new WorkflowGraph();
    workflowGraph.graph = convertToWorkflowGraph(workflowDefinition);
    return workflowGraph;
  }

  public get topologicalOrder(): string[] {
    if (!this.__topologicalOrder) {
      this.__topologicalOrder = graphlib.alg.topsort(this.graph!);
    }
    return this.__topologicalOrder;
  }

  public getNode(nodeId: string): GraphNode {
    return this.graph!.node(nodeId) as unknown as GraphNode;
  }

  public getNodeStack(nodeId: string): string[] {
    const predecessors = this.getAllPredecessors(nodeId).toReversed();

    const stack: string[] = [];
    for (const node of predecessors) {
      if (node.type.startsWith('enter-')) {
        stack.push(node.id);
      }

      if (node.type.startsWith('exit-')) {
        stack.pop();
      }
    }
    return stack;
  }

  public getAllNodes(): GraphNode[] {
    return this.graph!.nodes().map((nodeId) => this.graph!.node(nodeId) as unknown as GraphNode);
  }

  public getEdges(): Array<{ v: string; w: string }> {
    return this.graph!.edges().map((edge) => ({ v: edge.v, w: edge.w }));
  }

  public getStepGraph(stepId: string): WorkflowGraph {
    // Find the boundaries of the step in topological order
    const beginNodeIndex = this.topologicalOrder.findIndex(
      (id) => (this.getNode(id) as any).stepId === stepId
    );

    if (beginNodeIndex === -1) {
      throw new Error(`Step with id ${stepId} not found in the workflow graph.`);
    }

    // Find the last node of the target step
    let endNodeIndex = -1;
    for (let i = this.topologicalOrder.length - 1; i >= beginNodeIndex; i--) {
      const nodeId = this.topologicalOrder[i];
      if ((this.getNode(nodeId) as any).stepId === stepId) {
        endNodeIndex = i;
        break;
      }
    }

    if (endNodeIndex === -1) {
      throw new Error(`Step with id ${stepId} not found in the workflow graph.`);
    }

    // Extract all nodes between begin and end (inclusive) - this includes child steps
    const subGraphNodeIds = this.topologicalOrder.slice(beginNodeIndex, endNodeIndex + 1);
    const subGraph = new graphlib.Graph({ directed: true });

    // Add all nodes in the range to subgraph
    for (const nodeId of subGraphNodeIds) {
      subGraph.setNode(nodeId, this.graph!.node(nodeId));
    }

    // Add edges between nodes that are both in the subgraph
    const nodeIdSet = new Set(subGraphNodeIds);
    for (const nodeId of subGraphNodeIds) {
      const successors = this.graph!.successors(nodeId) || [];
      for (const succId of successors) {
        // Only add edge if both nodes are in the subgraph
        if (nodeIdSet.has(succId)) {
          subGraph.setEdge(nodeId, succId);
        }
      }
    }

    const workflowGraph = new WorkflowGraph();
    workflowGraph.graph = subGraph;
    return workflowGraph;
  }

  public getDirectSuccessors(nodeId: string): GraphNode[] {
    const successors = this.graph!.successors(nodeId) || [];
    return successors.map((id) => this.graph!.node(id) as unknown as GraphNode);
  }

  public getAllPredecessors(nodeId: string): GraphNode[] {
    const visited = new Set<string>();
    const collectPredecessors = (predNodeId: string) => {
      if (visited.has(predNodeId)) {
        return;
      }

      visited.add(predNodeId);

      const preds = this.graph!.predecessors(predNodeId) || [];
      preds.forEach((predId) => collectPredecessors(predId));
    };

    const directPredecessors = this.graph!.predecessors(nodeId) || [];
    directPredecessors.forEach((predId) => collectPredecessors(predId));
    return Array.from(visited).map((id) => this.graph!.node(id) as unknown as GraphNode);
  }
}
