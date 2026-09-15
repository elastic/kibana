/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StackFrame } from '@kbn/workflows';
import type { GraphNodeUnion } from '@kbn/workflows/graph';
import type { WorkflowRuntimeGraph } from './workflow_runtime_graph';
import { WorkflowScopeStack } from './workflow_scope_stack';

export interface WorkflowExecutionCursorInit {
  nodeId?: string;
  stackFrames?: StackFrame[];
  workflowExecutionGraph: WorkflowRuntimeGraph;
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
  navigateToSynthetic(params: { stepId: string; stepType: string }): void;
  readonly currentStackFrames: StackFrame[];
  setCurrentScopeId(scopeId?: string): void;
}

/**
 * In-memory cursor for workflow graph iteration: pending node navigation (`nextNodeId`),
 * whether the execution and persistence loops keep running (`isExecuting`), controlled with
 * {@link WorkflowExecutionCursor.start} and {@link WorkflowExecutionCursor.stop}.
 */
export class WorkflowExecutionCursor implements WorkflowExecutionCursorApi {
  private readonly runtimeGraph: WorkflowRuntimeGraph;
  private currentNodeId: string | undefined;
  private nextNodeId: string | undefined;
  private executing = true;
  private stackFrames: StackFrame[];
  private workflowError: Error | undefined;
  private pendingSynthetic: { currentNodeId: string; stepId: string; stepType: string } | undefined;

  constructor(init: WorkflowExecutionCursorInit) {
    this.runtimeGraph = init.workflowExecutionGraph;
    this.currentNodeId = init.nodeId || this.runtimeGraph.topologicalOrder[0];
    this.stackFrames = init.stackFrames ?? [];
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
   * Promotes `nextNodeId` to `currentNodeId` and rebuilds the scope stack from the graph.
   * Used after a normal `runNode` cycle and after each error-bubbling step once `navigateToNode` has set `nextNodeId`.
   */
  commitPendingNavigation(): void {
    if (this.pendingSynthetic) {
      this.nextNodeId = this.runtimeGraph.insertSyntheticScope(
        this.pendingSynthetic.currentNodeId,
        this.pendingSynthetic.stepId,
        this.pendingSynthetic.stepType
      );
      this.pendingSynthetic = undefined;
    }

    this.currentNodeId = this.nextNodeId;
    this.syncScopeStack();
  }

  public get currentNode(): GraphNodeUnion | null {
    if (!this.currentNodeId) {
      return null;
    }

    return this.runtimeGraph.getNode(this.currentNodeId) ?? null;
  }

  public get nextNode(): GraphNodeUnion | null {
    if (!this.nextNodeId) {
      return null;
    }

    return this.runtimeGraph.getNode(this.nextNodeId) ?? null;
  }

  public navigateToNode(nodeId: string): void {
    if (!this.runtimeGraph.getNode(nodeId)) {
      throw new Error(`Node with ID ${nodeId} is not part of the workflow graph`);
    }

    this.nextNodeId = nodeId;
  }

  public navigateToNextNode(): void {
    this.nextNodeId = this.runtimeGraph.nodeAfter(this.currentNodeId)?.id;
  }

  public navigateToAfterNode(nodeId: string): void {
    this.nextNodeId = this.runtimeGraph.nodeAfter(nodeId)?.id;
  }

  /**
   * Queues a synthetic enter/exit pair under the current node.
   * The overlay insert and cursor move happen on the next `commitPendingNavigation`.
   */
  public navigateToSynthetic(params: { stepId: string; stepType: string }): void {
    if (!this.currentNodeId) {
      throw new Error('Cannot insert a synthetic scope without a current node');
    }

    this.pendingSynthetic = {
      currentNodeId: this.currentNodeId,
      stepId: params.stepId,
      stepType: params.stepType,
    };
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

  private syncScopeStack(): void {
    if (!this.currentNodeId) {
      return;
    }

    const scopesMap = new Map<string, string | undefined>();

    for (const scope of this.stackFrames) {
      for (const nestedScope of scope.nestedScopes) {
        scopesMap.set(nestedScope.nodeId, nestedScope.scopeId);
      }
    }

    const frames = this.runtimeGraph.getNodeStack(this.currentNodeId).stackFrames;

    let currentNodeScope = new WorkflowScopeStack();

    for (const frame of frames) {
      for (const nestedScope of frame.nestedScopes) {
        currentNodeScope = currentNodeScope.enterScope({
          nodeId: nestedScope.nodeId,
          nodeType: nestedScope.nodeType,
          stepId: frame.stepId,
          scopeId: scopesMap.get(nestedScope.nodeId) ?? nestedScope.scopeId,
        });
      }
    }

    this.stackFrames = currentNodeScope.stackFrames;
  }
}
