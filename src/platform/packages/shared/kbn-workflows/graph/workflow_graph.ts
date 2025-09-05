/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import type { GraphNode } from '../types/execution';
import { convertToWorkflowGraph } from './build_execution_graph/build_execution_graph';

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

  public getStepGraph(stepId: string): WorkflowGraph {
    throw new Error('Not implemented yet');
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
