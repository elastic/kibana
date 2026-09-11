/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StackFrame } from '@kbn/workflows';
import type { GraphNodeUnion, SyntheticGraphNode, WorkflowGraph } from '@kbn/workflows/graph';
import { WorkflowScopeStack } from './workflow_scope_stack';

/** Prefix on ids of runtime-created enter nodes (e.g. a loop iteration). */
export const ENTER_SYNTHETIC_PREFIX = 'enterSynthetic_';
const ENTER_NODE_ID_PREFIX = 'enter';
const EXIT_NODE_ID_PREFIX = 'exit';

/**
 * Graph lookups a step needs: current node, neighbors, nested steps, timeout.
 * Use this type on step deps. The engine owns {@link WorkflowRuntimeGraph} itself.
 */
export type RuntimeGraphView = Pick<
  WorkflowRuntimeGraph,
  | 'getNode'
  | 'getDirectSuccessors'
  | 'getInnerStepIds'
  | 'getAllPredecessors'
  | 'getWorkflowLevelTimeout'
  | 'topologicalOrder'
  | 'nodeAfter'
>;

function getPairByNodeId(nodeId: string): { enterNodeId: string; exitNodeId: string } {
  const enterNodeId = nodeId.startsWith(EXIT_NODE_ID_PREFIX)
    ? nodeId.replace(EXIT_NODE_ID_PREFIX, ENTER_NODE_ID_PREFIX)
    : nodeId;
  const exitNodeId = nodeId.startsWith(ENTER_NODE_ID_PREFIX)
    ? nodeId.replace(ENTER_NODE_ID_PREFIX, EXIT_NODE_ID_PREFIX)
    : nodeId;
  return { enterNodeId, exitNodeId };
}

/**
 * The graph the execution cursor walks.
 *
 * Same nodes as the compiled workflow, plus scopes that only exist once the run
 * knows them — a foreach iteration, a while iteration. Look them up and land on
 * them the same way as compiled nodes. Pass `stackFrames` from a resumed
 * execution so those scopes are present again.
 */
export class WorkflowRuntimeGraph {
  private readonly originalNodesTopologicalOrder!: GraphNodeUnion[];
  private nodesInTopologicalOrder!: GraphNodeUnion[];
  private readonly syntheticNodesById = new Map<
    string,
    {
      node: SyntheticGraphNode;
      ownerId: string;
    }
  >();
  private readonly syntheticNodeIdByOwnerId = new Map<string, string>();

  constructor(private compiledGraph: WorkflowGraph, stackFrames: StackFrame[]) {
    this.originalNodesTopologicalOrder = compiledGraph.topologicalOrder
      .map((id) => compiledGraph.getNode(id))
      .filter((node): node is GraphNodeUnion => node !== undefined);
    this.init(compiledGraph, stackFrames);
  }

  /** Walk order for the current graph. The execution loop uses this to advance. */
  public get topologicalOrder(): string[] {
    return this.nodesInTopologicalOrder.map((node) => node.id);
  }

  /** Next node in walk order, or undefined at the end / if `nodeId` is missing. */
  public nodeAfter(nodeId: string | undefined): GraphNodeUnion | undefined {
    if (!nodeId) {
      return undefined;
    }

    const index = this.nodesInTopologicalOrder.findIndex((node) => node.id === nodeId);
    if (index >= 0 && index < this.nodesInTopologicalOrder.length - 1) {
      return this.nodesInTopologicalOrder[index + 1];
    }

    return undefined;
  }

  /**
   * Adds a runtime scope under `ownerNodeId` (one loop iteration) and returns the
   * enter node the cursor should move to.
   *
   * Wraps the compiled body the first time. Later mints replace that pair —
   * the body is not cloned.
   */
  public insertSyntheticScope(ownerNodeId: string, stepId: string, stepType: string): string {
    const { enter: enterSynthetic, exit: exitSynthetic } = this.createSyntheticScope(
      ownerNodeId,
      stepId,
      stepType
    );
    this.recordSyntheticScope(ownerNodeId, enterSynthetic, exitSynthetic);
    this.nodesInTopologicalOrder = this.upsertSyntheticNodes(this.originalNodesTopologicalOrder);
    return enterSynthetic.id;
  }

  /** Node the cursor or a step should run, by id. Missing id is `undefined`. */
  public getNode(nodeId: string): GraphNodeUnion | undefined {
    return this.nodesInTopologicalOrder.find((candidate) => candidate.id === nodeId);
  }

  /**
   * Direct outgoing neighbors, with the current synthetic pair rewired around
   * its owner enter/exit. Incoming edges to the owner enter stay compiled.
   */
  public getDirectSuccessors(nodeId: string): GraphNodeUnion[] {
    const synthetic = this.syntheticNodesById.get(nodeId);
    if (synthetic) {
      if (this.isEnterNode(synthetic.node)) {
        return this.compiledGraph.getDirectSuccessors(synthetic.ownerId);
      }

      return this.requireNodeList(synthetic.ownerId);
    }

    const mintedUnderNode = this.mintedSyntheticAt(nodeId);
    const nodePair = getPairByNodeId(nodeId);
    if (mintedUnderNode && nodePair.enterNodeId === nodeId && nodePair.exitNodeId !== nodeId) {
      return [mintedUnderNode];
    }

    return this.compiledGraph.getDirectSuccessors(nodeId).map((successor) => {
      const mintedAtSuccessor = this.mintedSyntheticAt(successor.id);
      const successorPair = getPairByNodeId(successor.id);
      if (
        mintedAtSuccessor &&
        successorPair.exitNodeId === successor.id &&
        successorPair.enterNodeId !== successor.id
      ) {
        return mintedAtSuccessor;
      }

      return successor;
    });
  }

  /** Transitive predecessors using the same owner-boundary rewire as successors. */
  public getAllPredecessors(nodeId: string): GraphNodeUnion[] {
    const visited = new Set<string>();
    const collect = (predNodeId: string) => {
      if (visited.has(predNodeId)) {
        return;
      }

      visited.add(predNodeId);
      for (const pred of this.getDirectPredecessors(predNodeId)) {
        collect(pred.id);
      }
    };

    for (const pred of this.getDirectPredecessors(nodeId)) {
      collect(pred.id);
    }

    return [...visited].map((id) => this.requireNode(id));
  }

  /** Step ids nested inside a compound step (foreach body, if branch, and so on). */
  public getInnerStepIds(compoundStepId: string): Set<string> {
    return this.compiledGraph.getInnerStepIds(compoundStepId);
  }

  /** Workflow-level timeout step, if the workflow defines one. */
  public getWorkflowLevelTimeout(): string | undefined {
    return this.compiledGraph.getWorkflowLevelTimeout();
  }

  /**
   * Scopes that are open when execution is on `nodeId`.
   * Resume and persist use this as the cursor's stack.
   */
  public getNodeStack(nodeId: string): WorkflowScopeStack {
    const nodeIndex = this.nodesInTopologicalOrder.findIndex(
      (candidate) => candidate.id === nodeId
    );

    if (nodeIndex < 0) {
      throw new Error(`Node not found for node id: ${nodeId}`);
    }

    // Current node is never a scope on its own stack.
    const beforeCurrent = this.nodesInTopologicalOrder.slice(0, nodeIndex);
    const openEnters: GraphNodeUnion[] = [];

    for (const node of beforeCurrent) {
      if (this.isEnterNode(node)) {
        openEnters.push(node);
      } else if (this.isExitNode(node)) {
        openEnters.pop();
      }
    }

    const current = this.nodesInTopologicalOrder[nodeIndex];
    if (this.isExitNode(current)) {
      openEnters.pop();
    }

    let scopeStack = new WorkflowScopeStack();

    for (const node of openEnters) {
      scopeStack = scopeStack.enterScope({
        nodeId: node.id,
        nodeType: node.type,
        stepId: node.stepId,
      });
    }

    return scopeStack;
  }

  private init(compiledGraph: WorkflowGraph, stackFrames: StackFrame[]): void {
    let scopeStack = WorkflowScopeStack.fromStackFrames(stackFrames);

    while (!scopeStack.isEmpty()) {
      const currentScope = scopeStack.getCurrentScope();
      scopeStack = scopeStack.exitScope();

      if (!compiledGraph.getNode(currentScope.nodeId)) {
        if (scopeStack.isEmpty()) {
          throw new Error(`Cannot hydrate synthetic scope ${currentScope.nodeId} without an owner`);
        }

        const previousScope = scopeStack.getCurrentScope();
        const ownerStepType = currentScope.nodeType.replace(/^(enter-|exit-)/, '');
        const { enter, exit } = this.createSyntheticScope(
          previousScope.nodeId,
          currentScope.stepId,
          ownerStepType
        );
        this.recordSyntheticScope(previousScope.nodeId, enter, exit);
      }
    }

    this.nodesInTopologicalOrder = this.upsertSyntheticNodes(this.originalNodesTopologicalOrder);
  }

  private isEnterNode(node: GraphNodeUnion): boolean {
    return node.type.startsWith('enter-');
  }

  private isExitNode(node: GraphNodeUnion): boolean {
    return node.type.startsWith('exit-');
  }

  private requireNode(nodeId: string): GraphNodeUnion {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`Node not found for node id: ${nodeId}`);
    }
    return node;
  }

  private requireNodeList(nodeId: string): GraphNodeUnion[] {
    return [this.requireNode(nodeId)];
  }

  private mintedSyntheticAt(ownerNodeId: string): SyntheticGraphNode | undefined {
    const syntheticId = this.syntheticNodeIdByOwnerId.get(ownerNodeId);
    return syntheticId ? this.syntheticNodesById.get(syntheticId)?.node : undefined;
  }

  private getDirectPredecessors(nodeId: string): GraphNodeUnion[] {
    const synthetic = this.syntheticNodesById.get(nodeId);
    if (synthetic) {
      if (this.isEnterNode(synthetic.node)) {
        return this.requireNodeList(synthetic.ownerId);
      }

      return this.directCompiledPredecessors(synthetic.ownerId);
    }

    const mintedUnderNode = this.mintedSyntheticAt(nodeId);
    const nodePair = getPairByNodeId(nodeId);
    if (mintedUnderNode && nodePair.exitNodeId === nodeId && nodePair.enterNodeId !== nodeId) {
      return [mintedUnderNode];
    }

    return this.directCompiledPredecessors(nodeId).map((predecessor) => {
      const mintedAtPredecessor = this.mintedSyntheticAt(predecessor.id);
      const predecessorPair = getPairByNodeId(predecessor.id);
      if (
        mintedAtPredecessor &&
        predecessorPair.enterNodeId === predecessor.id &&
        predecessorPair.exitNodeId !== predecessor.id
      ) {
        return mintedAtPredecessor;
      }

      return predecessor;
    });
  }

  private directCompiledPredecessors(nodeId: string): GraphNodeUnion[] {
    return this.originalNodesTopologicalOrder.filter((node) =>
      this.compiledGraph.getDirectSuccessors(node.id).some((successor) => successor.id === nodeId)
    );
  }

  /** Splices the current pair after the owner enter and before the owner exit. */
  private upsertSyntheticNodes(orderedNodes: GraphNodeUnion[]): GraphNodeUnion[] {
    const result = [];

    for (const node of orderedNodes) {
      const syntheticNodeId = this.syntheticNodeIdByOwnerId.get(node.id);
      const syntheticNode = syntheticNodeId
        ? this.syntheticNodesById.get(syntheticNodeId)
        : undefined;

      if (!syntheticNode) {
        result.push(node);
      } else {
        const nodePair = getPairByNodeId(node.id);
        if (nodePair.enterNodeId === node.id && nodePair.exitNodeId !== node.id) {
          result.push(node, syntheticNode.node);
        } else if (nodePair.exitNodeId === node.id && nodePair.enterNodeId !== node.id) {
          result.push(syntheticNode.node, node);
        } else {
          result.push(node);
        }
      }
    }

    return result;
  }

  private createSyntheticScope(
    ownerNodeId: string,
    stepId: string,
    stepType: string
  ): {
    enter: SyntheticGraphNode;
    exit: SyntheticGraphNode;
  } {
    const enterNodeType = `enter-${stepType}`;
    const exitNodeType = `exit-${stepType}`;
    const enterId = `${ENTER_SYNTHETIC_PREFIX}${ownerNodeId}_${stepId}`;
    const { exitNodeId } = getPairByNodeId(enterId);

    return {
      enter: {
        id: enterId,
        type: enterNodeType,
        stepId,
        stepType,
        isSynthetic: true,
      },
      exit: {
        id: exitNodeId,
        type: exitNodeType,
        stepId,
        stepType,
        isSynthetic: true,
      },
    };
  }

  private recordSyntheticScope(
    ownerNodeId: string,
    enter: SyntheticGraphNode,
    exit: SyntheticGraphNode
  ): void {
    const previousSyntheticScope = this.syntheticNodeIdByOwnerId.get(ownerNodeId);
    const { exitNodeId: ownerExitNodeId } = getPairByNodeId(ownerNodeId);

    if (previousSyntheticScope) {
      const { exitNodeId: previousExitId } = getPairByNodeId(previousSyntheticScope);
      this.syntheticNodesById.delete(previousSyntheticScope);
      this.syntheticNodesById.delete(previousExitId);
      this.syntheticNodeIdByOwnerId.delete(ownerNodeId);
      this.syntheticNodeIdByOwnerId.delete(ownerExitNodeId);
    }
    this.syntheticNodesById.set(enter.id, { node: enter, ownerId: ownerNodeId });
    this.syntheticNodesById.set(exit.id, { node: exit, ownerId: ownerExitNodeId });
    this.syntheticNodeIdByOwnerId.set(ownerNodeId, enter.id);
    this.syntheticNodeIdByOwnerId.set(ownerExitNodeId, exit.id);
  }
}
