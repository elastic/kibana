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
import { isSynthetic } from '@kbn/workflows/graph';
import { WorkflowScopeStack } from './workflow_scope_stack';

/** Prefix on ids of runtime-created enter nodes (e.g. a loop iteration). */
export const ENTER_SYNTHETIC_PREFIX = 'enterSynthetic_';
/** Prefix on ids of runtime-created exit nodes (e.g. a loop iteration). */
export const EXIT_SYNTHETIC_PREFIX = 'exitSynthetic_';

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

function syntheticPairTypes(stepType: string): { enterType: string; exitType: string } {
  if (stepType.startsWith('enter-')) {
    const base = stepType.slice('enter-'.length);
    return { enterType: `enter-${base}`, exitType: `exit-${base}` };
  }

  if (stepType.startsWith('exit-')) {
    const base = stepType.slice('exit-'.length);
    return { enterType: `enter-${base}`, exitType: `exit-${base}` };
  }

  return { enterType: `enter-${stepType}`, exitType: `exit-${stepType}` };
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
  private nodesInTopologicalOrder!: GraphNodeUnion[];

  constructor(private compiledGraph: WorkflowGraph, stackFrames: StackFrame[]) {
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
   * Wraps the compiled body the first time. Later mints rewire that same pair to
   * the new hashed ids — the body is not cloned.
   */
  public insertSyntheticScope(ownerNodeId: string, stepId: string, stepType: string): string {
    const { enter: enterSynthetic, exit: exitSynthetic } = this.createSyntheticScope(
      ownerNodeId,
      stepId,
      stepType
    );
    this.upsertSyntheticInTopo(ownerNodeId, enterSynthetic, exitSynthetic);
    return enterSynthetic.id;
  }

  /** Node the cursor or a step should run, by id. */
  public getNode(nodeId: string): GraphNodeUnion {
    const node = this.nodesInTopologicalOrder.find((candidate) => candidate.id === nodeId);

    if (!node) {
      throw new Error(`Node not found for node id: ${nodeId}`);
    }

    return node;
  }

  /** Compiled-graph successors only. Throws if `nodeId` is a synthetic. */
  public getDirectSuccessors(nodeId: string): GraphNodeUnion[] {
    this.assertCompiledNode(nodeId);
    return this.compiledGraph.getDirectSuccessors(nodeId);
  }

  /** Compiled-graph predecessors only. Throws if `nodeId` is a synthetic. */
  public getAllPredecessors(nodeId: string): GraphNodeUnion[] {
    this.assertCompiledNode(nodeId);
    return this.compiledGraph.getAllPredecessors(nodeId);
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
    this.nodesInTopologicalOrder = compiledGraph.topologicalOrder
      .map((id) => this.compiledGraph.getNode(id))
      .filter((node): node is GraphNodeUnion => node !== undefined);

    let scopeStack = WorkflowScopeStack.fromStackFrames(stackFrames);

    while (!scopeStack.isEmpty()) {
      const currentScope = scopeStack.getCurrentScope();
      scopeStack = scopeStack.exitScope();

      if (compiledGraph.getNode(currentScope.nodeId)) {
        continue;
      }

      if (scopeStack.isEmpty()) {
        throw new Error(`Cannot hydrate synthetic scope ${currentScope.nodeId} without an owner`);
      }

      const previousScope = scopeStack.getCurrentScope();
      const stepType = currentScope.nodeType.replace(/^(enter-|exit-)/, '');
      const { enter, exit } = this.createSyntheticScope(
        previousScope.nodeId,
        currentScope.stepId,
        stepType
      );
      this.upsertSyntheticInTopo(previousScope.nodeId, enter, exit);
    }
  }

  private assertCompiledNode(nodeId: string): void {
    if (!this.compiledGraph.getNode(nodeId)) {
      throw new Error(`Node ${nodeId} is not a compiled graph node`);
    }
  }

  private isEnterNode(node: GraphNodeUnion): boolean {
    return node.type.startsWith('enter-');
  }

  private isExitNode(node: GraphNodeUnion): boolean {
    return node.type.startsWith('exit-');
  }

  /**
   * Puts `enter` immediately after the owner enter and `exit` immediately before
   * the owner exit. If that pair is already there (same stepType), replace in place.
   */
  private upsertSyntheticInTopo(
    ownerNodeId: string,
    enter: SyntheticGraphNode,
    exit: SyntheticGraphNode
  ): void {
    const { ownerEnterIndex, ownerExitIndex } = this.findOwnerEnterExitIndexes(
      ownerNodeId,
      this.nodesInTopologicalOrder
    );
    const childNode = this.nodesInTopologicalOrder[ownerEnterIndex + 1];

    if (childNode && isSynthetic(childNode) && childNode.stepType === enter.stepType) {
      this.nodesInTopologicalOrder[ownerEnterIndex + 1] = enter;
      this.nodesInTopologicalOrder[ownerExitIndex - 1] = exit;
      return;
    }

    // Higher index first so ownerEnterIndex stays valid.
    this.nodesInTopologicalOrder.splice(ownerExitIndex, 0, exit);
    this.nodesInTopologicalOrder.splice(ownerEnterIndex + 1, 0, enter);
  }

  private findOwnerEnterExitIndexes(
    ownerEnterNodeId: string,
    nodesInTopologicalOrder: GraphNodeUnion[]
  ): {
    ownerEnterIndex: number;
    ownerExitIndex: number;
  } {
    const ownerExitNodeId = this.compiledOwnerExitId(ownerEnterNodeId);

    let ownerEnterIndex: number | undefined;
    let ownerExitIndex: number | undefined;

    for (let i = 0; i < nodesInTopologicalOrder.length; i++) {
      const node = nodesInTopologicalOrder[i];
      if (ownerEnterIndex === undefined && node.id === ownerEnterNodeId) {
        ownerEnterIndex = i;
      }

      if (ownerExitIndex === undefined && node.id === ownerExitNodeId) {
        ownerExitIndex = i;
        break;
      }
    }

    if (ownerEnterIndex === undefined || ownerExitIndex === undefined) {
      throw new Error(`Owner enter or exit index not found for node ${ownerEnterNodeId}`);
    }

    return { ownerEnterIndex, ownerExitIndex };
  }

  private compiledOwnerExitId(ownerEnterNodeId: string): string {
    const owner = this.compiledGraph.getNode(ownerEnterNodeId);
    if (owner && 'exitNodeId' in owner && typeof owner.exitNodeId === 'string') {
      return owner.exitNodeId;
    }

    return ownerEnterNodeId.replace(/^enter/, 'exit');
  }

  private createSyntheticScope(
    ownerNodeId: string,
    stepId: string,
    stepType: string
  ): {
    enter: SyntheticGraphNode;
    exit: SyntheticGraphNode;
  } {
    const { enterType, exitType } = syntheticPairTypes(stepType);

    return {
      enter: {
        id: `${ENTER_SYNTHETIC_PREFIX}${ownerNodeId}_${stepId}`,
        type: enterType,
        stepId,
        stepType,
        isSynthetic: true,
      },
      exit: {
        id: `${EXIT_SYNTHETIC_PREFIX}${ownerNodeId}_${stepId}`,
        type: exitType,
        stepId,
        stepType,
        isSynthetic: true,
      },
    };
  }
}
