/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import type {
  AtomicGraphNode,
  EnterForeachNode,
  HttpGraphNode,
  WaitGraphNode,
  UnionExecutionGraphNode,
} from '../types/execution';

/**
 * Interface for representing a step in a nested tree structure
 */
export interface StepListTreeItem {
  stepId: string;
  stepType: string;
  topologicalIndex: number;
  executionIndex: number;
  children: StepListTreeItem[];
}

/**
 * Extracts nested steps from a workflow graph and returns them in a tree structure.
 * This function traverses the execution graph and builds a hierarchical representation
 * of the workflow steps, preserving the nested structure of control flow constructs
 * like if/else, foreach, retry, etc.
 *
 * @param graph - The workflow execution graph produced by convertToWorkflowGraph()
 * @returns Array of StepListTreeItem representing the nested step structure
 */
export function getNestedStepsFromGraph(
  graph: graphlib.Graph<UnionExecutionGraphNode>
): StepListTreeItem[] {
  const visited = new Set<string>();
  const result: StepListTreeItem[] = [];

  // Get topological order to ensure proper execution sequence
  const topologicalOrder = graphlib.alg.topsort(graph);

  // Create a map for quick node lookup
  const nodeMap = new Map<string, UnionExecutionGraphNode>();
  for (const nodeId of topologicalOrder) {
    const node = graph.node(nodeId);
    if (node) {
      nodeMap.set(nodeId, node);
    }
  }

  // Process nodes in topological order to build the tree
  let topologicalIndex = 0;
  for (const nodeId of topologicalOrder) {
    if (!visited.has(nodeId)) {
      const treeItem = buildTreeFromNode(nodeId, nodeMap, graph, visited, topologicalIndex);
      if (treeItem) {
        result.push(treeItem);
        topologicalIndex++;
      }
    }
  }

  return result;
}

/**
 * Helper function to determine if a node is an exit node
 */
function isExitNode(node: UnionExecutionGraphNode): boolean {
  return node.type.startsWith('exit-');
}

/**
 * Helper function to determine if a node represents an actual step execution
 * (not a control flow construct)
 */
function isExecutableStep(node: UnionExecutionGraphNode): boolean {
  return ['atomic', 'http', 'wait'].includes(node.type);
}

/**
 * Helper function to determine if a node is an enter node for a control structure
 */
function isEnterNode(node: UnionExecutionGraphNode): boolean {
  return node.type.startsWith('enter-');
}

/**
 * Recursively builds a tree structure from a graph node
 */
function buildTreeFromNode(
  nodeId: string,
  nodeMap: Map<string, UnionExecutionGraphNode>,
  graph: graphlib.Graph<UnionExecutionGraphNode>,
  visited: Set<string>,
  topologicalIndex: number,
  executionIndex: number = 0
): StepListTreeItem | null {
  if (visited.has(nodeId)) {
    return null;
  }

  const node = nodeMap.get(nodeId);
  if (!node) {
    return null;
  }

  visited.add(nodeId);

  // For executable steps, create a tree item
  if (isExecutableStep(node)) {
    return {
      stepId: node.id,
      topologicalIndex,
      executionIndex,
      stepType:
        (node as AtomicGraphNode | HttpGraphNode | WaitGraphNode).configuration?.type || node.type,
      children: [],
    };
  }

  // For control flow structures, we need to handle them differently
  if (isEnterNode(node)) {
    const children: StepListTreeItem[] = [];
    let childExecutionIndex = 0;

    // Handle different types of enter nodes
    switch (node.type) {
      case 'enter-if': {
        // Find the condition branches and process them
        const successors = graph.successors(nodeId) || [];
        for (const successorId of successors) {
          const successorNode = nodeMap.get(successorId);
          if (successorNode?.type === 'enter-condition-branch') {
            const branchChildren = processBranch(
              successorId,
              nodeMap,
              graph,
              visited,
              topologicalIndex,
              childExecutionIndex
            );
            children.push(...branchChildren);
            childExecutionIndex += branchChildren.length;
          }
        }
        break;
      }

      case 'enter-foreach': {
        const foreachNode = node as EnterForeachNode;
        // Process items in foreach loop
        for (const itemNodeId of foreachNode.itemNodeIds) {
          const child = buildTreeFromNode(
            itemNodeId,
            nodeMap,
            graph,
            visited,
            topologicalIndex,
            childExecutionIndex
          );
          if (child) {
            children.push(child);
            childExecutionIndex++;
          }
        }
        break;
      }

      case 'enter-retry':
      case 'enter-continue':
      case 'enter-try-block': {
        // For these nodes, process all direct successors that are not exit nodes
        const successors = graph.successors(nodeId) || [];
        for (const successorId of successors) {
          const successorNode = nodeMap.get(successorId);
          if (successorNode && !isExitNode(successorNode)) {
            const child = buildTreeFromNode(
              successorId,
              nodeMap,
              graph,
              visited,
              topologicalIndex,
              childExecutionIndex
            );
            if (child) {
              children.push(child);
              childExecutionIndex++;
            }
          }
        }
        break;
      }
    }

    // If this enter node represents a step with children, return it
    if (children.length > 0) {
      return {
        stepId: node.id,
        topologicalIndex,
        executionIndex,
        stepType: node.type,
        children,
      };
    }
  }

  // For nodes that don't represent steps themselves, continue traversing
  const successors = graph.successors(nodeId) || [];
  for (const successorId of successors) {
    const child = buildTreeFromNode(
      successorId,
      nodeMap,
      graph,
      visited,
      topologicalIndex,
      executionIndex
    );
    if (child) {
      return child;
    }
  }

  return null;
}

/**
 * Helper function to process a branch (like in if/else)
 */
function processBranch(
  branchNodeId: string,
  nodeMap: Map<string, UnionExecutionGraphNode>,
  graph: graphlib.Graph<UnionExecutionGraphNode>,
  visited: Set<string>,
  topologicalIndex: number,
  startExecutionIndex: number
): StepListTreeItem[] {
  const children: StepListTreeItem[] = [];
  let executionIndex = startExecutionIndex;

  visited.add(branchNodeId);

  // Process all successors of the branch node until we hit an exit branch node
  const successors = graph.successors(branchNodeId) || [];
  for (const successorId of successors) {
    const successorNode = nodeMap.get(successorId);
    if (successorNode?.type === 'exit-condition-branch') {
      break; // Stop at exit branch
    }

    const child = buildTreeFromNode(
      successorId,
      nodeMap,
      graph,
      visited,
      topologicalIndex,
      executionIndex
    );
    if (child) {
      children.push(child);
      executionIndex++;
    }
  }

  return children;
}
