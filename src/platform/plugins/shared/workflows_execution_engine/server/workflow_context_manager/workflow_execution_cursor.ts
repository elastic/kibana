/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StackFrame } from '@kbn/workflows';
import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import { WorkflowScopeStack } from './workflow_scope_stack';

const SYNTHETIC_ENTER_PREFIX = 'enter-synthetic-';
const SYNTHETIC_EXIT_PREFIX = 'exit-synthetic-';

export interface WorkflowExecutionCursorInit {
  nodeId?: string;
  stackFrames?: StackFrame[];
  workflowExecutionGraph: WorkflowGraph;
}

export interface NavigateToSyntheticParams {
  stepId: string;
  nodeType: string;
  nodeId: string;
  scopeId?: string;
  exitNodeId?: string;
  stepType?: string;
}

/** Public surface of {@link WorkflowExecutionCursor} for typing mocks and loop params. */
export interface WorkflowExecutionCursorApi {
  readonly isExecuting: boolean;
  readonly error: Error | undefined;
  captureError(caught: unknown): void;
  clearError(): void;
  start(): void;
  stop(): void;
  commitPendingNavigation(): void;
  readonly currentNode: GraphNodeUnion | null;
  readonly nextNode: GraphNodeUnion | null;
  navigateToNode(nodeId: string): void;
  navigateToNextNode(): void;
  navigateToAfterNode(nodeId: string): void;
  navigateToSynthetic(params: NavigateToSyntheticParams): void;
  readonly currentStackFrames: StackFrame[];
  setCurrentScopeId(scopeId?: string): void;
}

/**
 * In-memory cursor for workflow graph iteration: pending node navigation (`nextNodeId`),
 * whether the execution and persistence loops keep running (`isExecuting`), controlled with
 * {@link WorkflowExecutionCursor.start} and {@link WorkflowExecutionCursor.stop}.
 *
 * Synthetics are stack annotations owned by a compiled enter node. The cursor prefixes
 * `enter-synthetic-` / `exit-synthetic-` when sitting on one. Leave visits the paired
 * synthetic exit before the compiled owner exit.
 */
export class WorkflowExecutionCursor implements WorkflowExecutionCursorApi {
  private readonly workflowGraph: WorkflowGraph;
  private executing = true;
  private stackFrames: StackFrame[];
  private workflowError: Error | undefined;
  private syntheticsMap = new Map<string, string>();
  private syntheticNodesMap = new Map<string, GraphNodeUnion>();
  private _currentNode: GraphNodeUnion | undefined;
  private _nextNode: GraphNodeUnion | undefined;

  constructor(init: WorkflowExecutionCursorInit) {
    this.workflowGraph = init.workflowExecutionGraph;
    this.hydrateSyntheticsFromStack(init.stackFrames ?? []);
    this.stackFrames = [];
    this.restoreCurrentNode(init.nodeId, init.stackFrames ?? []);
  }

  /**
   * Whether the execution is currently running.
   */
  public get isExecuting(): boolean {
    return this.executing;
  }

  public get error(): Error | undefined {
    return this.workflowError;
  }

  /**
   * Records a execution-level error from a caught/thrown value.
   * Synchronous so callers may invoke it after `await` without tripping `require-atomic-updates`.
   */
  public captureError(caught: unknown): void {
    this.workflowError = caught instanceof Error ? caught : new Error(String(caught));
  }

  /**
   * Clears the execution-level error.
   */
  public clearError(): void {
    this.workflowError = undefined;
  }

  /**
   * Starts the execution cursor: execution and persistence loops run while `isExecuting` is true.
   * Called when the top-level workflow execution loop begins.
   */
  public start(): void {
    this.executing = true;
  }

  /**
   * Stops the execution and persistence loops (`isExecuting` becomes false).
   *
   * Called from step logic to break out early, from task abort, and from the top-level loop `finally`
   * after a run (success or error). Workflow status may still be RUNNING unless callers update it.
   */
  public stop(): void {
    this.executing = false;
  }

  /**
   * Promotes `nextNode` to `currentNode` and rebuilds the scope stack from the graph.
   * Used after a normal `runNode` cycle and after each error-bubbling step once `navigateToNode` has set `nextNode`.
   */
  commitPendingNavigation(): void {
    const ownedSynthetic = this.getOwnedSynthetic();

    if (ownedSynthetic) {
      this._nextNode = ownedSynthetic;
    } else if (this.currentNode?.id) {
      this._nextNode = this.nodeAfter(this.currentNode.id);
    }

    this._currentNode = this._nextNode;
    this._nextNode = undefined;

    if (this._currentNode) {
      this.stackFrames = this.buildScopeStack(this.stackFrames, this._currentNode).stackFrames;
    }
  }

  public get currentNode(): GraphNodeUnion | null {
    if (!this._currentNode) {
      return null;
    }

    return this._currentNode;
  }

  public get nextNode(): GraphNodeUnion | null {
    if (!this._nextNode) {
      return null;
    }

    return this._nextNode;
  }

  public navigateToNode(nodeId: string): void {
    const syntheticNode = this.resolveSyntheticNode(nodeId);

    if (syntheticNode) {
      this._nextNode = syntheticNode;
      return;
    }

    const node = this.workflowGraph.getNode(nodeId);

    if (!node) {
      throw new Error(`Node with ID ${nodeId} is not part of the workflow graph`);
    }

    this._nextNode = node;
  }

  public navigateToNextNode(): void {
    const ownerId = this.ownerIdOfSynthetic(this._currentNode);

    if (ownerId && this._currentNode) {
      if (this._currentNode.id.startsWith(SYNTHETIC_EXIT_PREFIX)) {
        this.deleteSynthetic(ownerId);
        this._nextNode = this.compiledExitNode(ownerId);
        return;
      }

      this._nextNode = this.nodeAfter(ownerId);
      return;
    }

    this._nextNode = this.nodeAfter(this._currentNode?.id);
  }

  public navigateToAfterNode(nodeId: string): void {
    this._nextNode = this.nodeAfter(nodeId);
  }

  public navigateToSynthetic(params: NavigateToSyntheticParams): void {
    if (!this._currentNode || !this.isCompiledEnter(this._currentNode)) {
      throw new Error('Only enter node can enter synthetic scopes');
    }

    this.setSynthetic(this._currentNode.id, {
      id: params.nodeId,
      type: params.nodeType,
      stepId: params.stepId,
      stepType: params.stepType ?? params.nodeType,
    } as GraphNodeUnion);
  }

  public get currentStackFrames(): StackFrame[] {
    return this.stackFrames;
  }

  public setCurrentScopeId(scopeId?: string): void {
    if (!this.currentNode) {
      return;
    }

    this.stackFrames = WorkflowScopeStack.fromStackFrames(this.stackFrames).enterScope({
      nodeId: this.currentNode.id,
      nodeType: this.currentNode.type,
      stepId: this.currentNode.stepId,
      scopeId,
    }).stackFrames;
  }

  private restoreCurrentNode(nodeId: string | undefined, stackFrames: StackFrame[]): void {
    if (!nodeId) {
      const firstNodeId = this.workflowGraph.topologicalOrder[0];
      this._currentNode = firstNodeId ? this.workflowGraph.getNode(firstNodeId) : undefined;
    } else {
      this._currentNode =
        this.workflowGraph.getNode(nodeId) ?? this.syntheticNodeForPersistedId(nodeId);
    }

    if (this._currentNode) {
      this.stackFrames = this.buildScopeStack(stackFrames, this._currentNode).stackFrames;
    }
  }

  /**
   * If the current compiled node owns a synthetic, return that node.
   * Enter: the minted synthetic. Exit: the paired synthetic.
   */
  private getOwnedSynthetic(): GraphNodeUnion | null {
    if (!this._currentNode) {
      return null;
    }

    if (this.currentNode.id.startsWith(SYNTHETIC_ENTER_PREFIX)) {
      const ownerId = this.ownerIdOfSynthetic(this._currentNode);
      const node = this.nodeAfter(ownerId);

      if (node) {
        return node;
      }
    }

    if (this.currentNode.id.startsWith(SYNTHETIC_EXIT_PREFIX)) {
      const ownerId = this.ownerIdOfSynthetic(this._currentNode);
      const syb = ownerId?.substring('enter'.length);
      const node = this.nodeAfter(`exit${syb}`);
      if (node) {
        return node;
      }
    }

    if (this._currentNode.type?.startsWith('enter-')) {
      const synthetic = this.getSyntheticNodeForOwner(this._currentNode.id);
      return synthetic ? this.asEnter(synthetic) : null;
    }

    if (this._currentNode.type?.startsWith('exit-')) {
      const ownerId = this.ownerIdForCompiledExit(this._currentNode);
      const synthetic = this.getSyntheticNodeForOwner(ownerId);
      return synthetic ? this.asExit(synthetic) : null;
    }

    return null;
  }

  private syntheticExitIfLeavingOwner(next: GraphNodeUnion | undefined): GraphNodeUnion | null {
    if (!next || !this.isCompiledNode(next) || !next.type?.startsWith('exit-')) {
      return null;
    }

    const ownerId = this.ownerIdForCompiledExit(next);
    const synthetic = this.getSyntheticNodeForOwner(ownerId);
    return synthetic ? this.asExit(synthetic) : null;
  }

  private resolveSyntheticNode(nodeId: string): GraphNodeUnion | undefined {
    const stored = this.syntheticNodesMap.get(this.enterSyntheticId(nodeId));

    if (!stored) {
      return undefined;
    }

    if (nodeId.startsWith(SYNTHETIC_EXIT_PREFIX) || nodeId.startsWith('exit-')) {
      return this.asExit(stored);
    }

    return this.asEnter(stored);
  }

  private hasSyntheticNode(nodeId: string): boolean {
    return this.syntheticNodesMap.has(this.enterSyntheticId(nodeId));
  }

  private enterSyntheticId(nodeId: string): string {
    return `${SYNTHETIC_ENTER_PREFIX}${this.bareSyntheticId(nodeId)}`;
  }

  private syntheticNodeForPersistedId(nodeId: string): GraphNodeUnion | undefined {
    return this.resolveSyntheticNode(nodeId);
  }

  private getSyntheticNodeForOwner(ownerId: string | undefined): GraphNodeUnion | undefined {
    if (!ownerId) {
      return undefined;
    }

    const syntheticId = this.syntheticsMap.get(ownerId);
    return syntheticId ? this.syntheticNodesMap.get(syntheticId) : undefined;
  }

  private setSynthetic(ownerId: string, synthetic: GraphNodeUnion): void {
    const previousSyntheticId = this.syntheticsMap.get(ownerId);
    if (previousSyntheticId) {
      this.syntheticNodesMap.delete(previousSyntheticId);
    }

    const enterId = this.enterSyntheticId(synthetic.id);
    this.syntheticsMap.set(ownerId, enterId);
    this.syntheticNodesMap.set(enterId, {
      ...synthetic,
      id: this.bareSyntheticId(synthetic.id),
    } as GraphNodeUnion);
  }

  private deleteSynthetic(ownerId: string): void {
    const syntheticId = this.syntheticsMap.get(ownerId);
    this.syntheticsMap.delete(ownerId);
    if (syntheticId) {
      this.syntheticNodesMap.delete(syntheticId);
    }
  }

  private asEnter(synthetic: GraphNodeUnion): GraphNodeUnion {
    return {
      ...synthetic,
      id: `${SYNTHETIC_ENTER_PREFIX}${this.bareSyntheticId(synthetic.id)}`,
      type: `enter-${this.bareSyntheticId(synthetic.type)}`,
    } as GraphNodeUnion;
  }

  private asExit(synthetic: GraphNodeUnion): GraphNodeUnion {
    return {
      ...synthetic,
      id: `${SYNTHETIC_EXIT_PREFIX}${this.bareSyntheticId(synthetic.id)}`,
      type: `exit-${this.bareSyntheticId(synthetic.type)}`,
    } as GraphNodeUnion;
  }

  private isCompiledNode(node: GraphNodeUnion): boolean {
    return Boolean(this.workflowGraph.getNode(node.id));
  }

  private isCompiledEnter(node: GraphNodeUnion): boolean {
    return this.isCompiledNode(node) && Boolean(node.type?.startsWith('enter-'));
  }

  private ownerIdOfSynthetic(node: GraphNodeUnion | undefined): string | undefined {
    if (!node || this.isCompiledNode(node)) {
      return undefined;
    }

    const enterId = this.enterSyntheticId(node.id);

    for (const [ownerId, syntheticId] of this.syntheticsMap) {
      if (syntheticId === node.id || syntheticId === enterId) {
        return ownerId;
      }
    }

    return undefined;
  }

  private ownerIdForCompiledExit(node: GraphNodeUnion): string | undefined {
    if ('startNodeId' in node && typeof node.startNodeId === 'string') {
      return node.startNodeId;
    }

    if (node.id.startsWith('exit-')) {
      return node.id.replace(/^exit-/, 'enter-');
    }

    return undefined;
  }

  private compiledExitNode(ownerId: string): GraphNodeUnion | undefined {
    const owner = this.workflowGraph.getNode(ownerId);

    if (owner && 'exitNodeId' in owner && typeof owner.exitNodeId === 'string') {
      return this.workflowGraph.getNode(owner.exitNodeId);
    }

    if (ownerId.startsWith('enter-')) {
      return this.workflowGraph.getNode(ownerId.replace(/^enter-/, 'exit-'));
    }

    return undefined;
  }

  private nodeAfter(nodeId: string | undefined): GraphNodeUnion | undefined {
    const topologicalOrder = this.workflowGraph.topologicalOrder;
    const index = topologicalOrder.findIndex((id) => id === nodeId);
    if (index >= 0 && index < topologicalOrder.length - 1) {
      return this.workflowGraph.getNode(topologicalOrder[index + 1]);
    }
    return undefined;
  }

  private compiledAncestorIds(currentNode: GraphNodeUnion): string[] {
    const ownerId = this.ownerIdOfSynthetic(currentNode);

    if (ownerId) {
      return [...this.workflowGraph.getNodeStack(ownerId), ownerId];
    }

    return this.workflowGraph.getNodeStack(currentNode.id);
  }

  private buildScopeStack(
    stackFrames: StackFrame[],
    currentNode: GraphNodeUnion
  ): WorkflowScopeStack {
    const scopesMap = new Map<string, string | undefined>();

    for (const scope of stackFrames) {
      for (const nestedScope of scope.nestedScopes) {
        scopesMap.set(nestedScope.nodeId, nestedScope.scopeId);
      }
    }

    const sittingOnSyntheticExit =
      Boolean(this.ownerIdOfSynthetic(currentNode)) &&
      currentNode.id.startsWith(SYNTHETIC_EXIT_PREFIX);

    let currentNodeScope = new WorkflowScopeStack();

    for (const nodeId of this.compiledAncestorIds(currentNode)) {
      const nodeFromGraph = this.workflowGraph.getNode(nodeId);

      currentNodeScope = currentNodeScope.enterScope({
        nodeId: nodeFromGraph.id,
        nodeType: nodeFromGraph.type,
        stepId: nodeFromGraph.stepId,
        scopeId: scopesMap.get(nodeFromGraph.id),
      });

      const synthetic = this.getSyntheticNodeForOwner(nodeFromGraph.id);

      if (synthetic && !sittingOnSyntheticExit) {
        const enterSynthetic = this.asEnter(synthetic);
        currentNodeScope = currentNodeScope.enterScope({
          nodeId: enterSynthetic.id,
          nodeType: enterSynthetic.type,
          stepId: synthetic.stepId,
          scopeId:
            scopesMap.get(enterSynthetic.id) ?? scopesMap.get(synthetic.id) ?? synthetic.stepId,
        });
      }
    }

    return currentNodeScope;
  }

  private hydrateSyntheticsFromStack(stackFrames: StackFrame[]): void {
    this.syntheticsMap.clear();
    this.syntheticNodesMap.clear();
    let scopeStack = WorkflowScopeStack.fromStackFrames(stackFrames);

    while (!scopeStack.isEmpty()) {
      const currentScope = scopeStack.getCurrentScope();
      const previousStack = scopeStack.exitScope();

      if (!this.workflowGraph.getNode(currentScope.nodeId) && !previousStack.isEmpty()) {
        const previousScope = previousStack.getCurrentScope();
        this.setSynthetic(previousScope.nodeId, {
          id: this.bareSyntheticId(currentScope.nodeId),
          type: this.bareSyntheticId(currentScope.nodeType),
          stepId: currentScope.stepId,
          stepType: this.bareSyntheticId(currentScope.nodeType),
        } as GraphNodeUnion);
      }

      scopeStack = previousStack;
    }
  }

  private bareSyntheticId(value: string): string {
    return value.replace(/^(enter|exit)-synthetic-/, '').replace(/^(enter|exit)-/, '');
  }
}
