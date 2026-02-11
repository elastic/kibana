/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GraphEdge } from '@dagrejs/dagre';
import { graphlib } from '@dagrejs/dagre';
import { createTypedGraph } from './create_typed_graph';
import type { WorkflowSettings, WorkflowYaml } from '../..';
import { convertToWorkflowGraph } from '../build_execution_graph/build_execution_graph';
import type { GraphNodeUnion } from '../types';

/**
 * A class that encapsulates the logic of workflow graph operations and provides
 * a specific API to work with directed graphs representing workflow definitions.
 *
 * This class wraps the graphlib.Graph functionality and provides workflow-specific
 * methods for traversing, analyzing, and extracting subgraphs from workflow definitions.
 *
 * @example
 * ```typescript
 * const workflowGraph = WorkflowGraph.fromWorkflowDefinition(workflowDef);
 * const nodes = workflowGraph.getAllNodes();
 * const stepGraph = workflowGraph.getStepGraph('step-id');
 * ```
 */
export class WorkflowGraph {
  private graph: graphlib.Graph<GraphNodeUnion>;
  private __topologicalOrder: string[] | null = null;
  private stepIdsSet: Set<string> | null = null;

  constructor(graph: graphlib.Graph<GraphNodeUnion>) {
    this.graph = graph;
  }

  public static fromWorkflowDefinition(
    workflowDefinition: WorkflowYaml,
    defaultSettings?: WorkflowSettings
  ): WorkflowGraph {
    return new WorkflowGraph(convertToWorkflowGraph(workflowDefinition, defaultSettings));
  }

  public get topologicalOrder(): string[] {
    if (!this.__topologicalOrder) {
      this.__topologicalOrder = graphlib.alg.topsort(this.graph);
    }
    return this.__topologicalOrder;
  }

  public getNode(nodeId: string): GraphNodeUnion {
    return this.graph.node(nodeId);
  }

  /**
   * Retrieves a step node by its step ID, accounting for control flow node prefixes.
   * This method tries to find the node with the given step ID, checking for common
   * control flow node prefixes (enterForeach_, enterCondition_, enterIf_, etc.)
   *
   * @param stepId - The step ID to search for
   * @returns The graph node if found, undefined otherwise
   */
  public getStepNode(stepId: string): GraphNodeUnion | undefined {
    const nodePrefixes = [
      '', // Try the exact step ID first
      'enterForeach_',
      'enterCondition_',
    ];

    for (const prefix of nodePrefixes) {
      const nodeId = `${prefix}${stepId}`;
      const node = this.graph.node(nodeId);
      if (node) {
        return node;
      }
    }

    return undefined;
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

  public getAllNodes(): GraphNodeUnion[] {
    return this.graph.nodes().map((nodeId) => this.graph.node(nodeId));
  }

  public getEdges(): Array<{ v: string; w: string }> {
    return this.graph.edges().map((edge) => ({ v: edge.v, w: edge.w }));
  }

  public getEdge(edgeMetadata: { v: string; w: string }): GraphEdge {
    return this.graph.edge(edgeMetadata);
  }

  public hasStep(stepId: string): boolean {
    if (!this.stepIdsSet) {
      this.stepIdsSet = new Set(this.getAllNodes().map((node) => node.stepId));
    }

    return this.stepIdsSet.has(stepId);
  }

  public getStepGraph(stepId: string): WorkflowGraph {
    // Find the boundaries of the step in topological order
    const beginNodeIndex = this.topologicalOrder.findIndex(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (id) => (this.getNode(id) as any).stepId === stepId
    );

    if (beginNodeIndex === -1) {
      throw new Error(`Step with id ${stepId} not found in the workflow graph.`);
    }

    // Find the last node of the target step
    let endNodeIndex = -1;
    for (let i = this.topologicalOrder.length - 1; i >= beginNodeIndex; i--) {
      const nodeId = this.topologicalOrder[i];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const subGraph = createTypedGraph({ directed: true });

    // Add all nodes in the range to subgraph
    for (const nodeId of subGraphNodeIds) {
      subGraph.setNode(nodeId, this.graph.node(nodeId));
    }

    // Add edges between nodes that are both in the subgraph
    const nodeIdSet = new Set(subGraphNodeIds);
    for (const nodeId of subGraphNodeIds) {
      const successors = this.graph.successors(nodeId) || [];
      for (const succId of successors) {
        // Only add edge if both nodes are in the subgraph
        if (nodeIdSet.has(succId)) {
          subGraph.setEdge(nodeId, succId);
        }
      }
    }

    return new WorkflowGraph(subGraph);
  }

  public getDirectSuccessors(nodeId: string): GraphNodeUnion[] {
    const successors = this.graph.successors(nodeId) || [];
    return successors.map((id) => this.graph.node(id));
  }

  public getAllPredecessors(nodeId: string): GraphNodeUnion[] {
    const visited = new Set<string>();
    const collectPredecessors = (predNodeId: string) => {
      if (visited.has(predNodeId)) {
        return;
      }

      visited.add(predNodeId);

      const preds = this.graph.predecessors(predNodeId) || [];
      preds.forEach((predId) => collectPredecessors(predId));
    };

    const directPredecessors = this.graph.predecessors(nodeId) || [];
    directPredecessors.forEach((predId) => collectPredecessors(predId));
    return Array.from(visited).map((id) => this.graph.node(id));
  }
}
