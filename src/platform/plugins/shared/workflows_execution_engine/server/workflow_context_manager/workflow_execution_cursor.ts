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

export interface WorkflowExecutionCursorInit {
  nodeId?: string;
  stackFrames?: StackFrame[];
  workflowExecutionGraph: WorkflowGraph;
}

interface SyntheticNodeData {
  nodeId: string;
  nodeType: string;
  stepId: string;
  stackFrame: StackFrame;
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
  readonly currentStackFrames: StackFrame[];
  setCurrentScopeId(scopeId?: string): void;
  navigateToSynthetic(params: {
    stepId: string;
    nodeType: string;
    nodeId?: string;
    scopeId?: string;
  }): void;
}

/**
 * In-memory cursor for workflow graph iteration: pending node navigation (`nextNodeId`),
 * whether the execution and persistence loops keep running (`isExecuting`), controlled with
 * {@link WorkflowExecutionCursor.start} and {@link WorkflowExecutionCursor.stop}.
 */
export class WorkflowExecutionCursor implements WorkflowExecutionCursorApi {
  private readonly workflowGraph: WorkflowGraph;
  private currentNodeId: string | undefined;
  private nextNodeId: string | undefined;
  private executing = true;
  private stackFrames: StackFrame[];
  private workflowError: Error | undefined;
  private syntheticStackFramesMap = new Map<string, SyntheticNodeData>();

  constructor(init: WorkflowExecutionCursorInit) {
    this.workflowGraph = init.workflowExecutionGraph;
    this.currentNodeId = init.nodeId || this.workflowGraph.topologicalOrder[0];
    this.stackFrames = init.stackFrames ?? [];
    this.hydrateSyntheticMapFromStack(this.stackFrames);
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
    this.currentNodeId = this.nextNodeId;
    this.syncScopeStack();
  }

  public get currentNode(): GraphNodeUnion | null {
    return this.resolveNode(this.currentNodeId);
  }

  public get nextNode(): GraphNodeUnion | null {
    return this.resolveNode(this.nextNodeId);
  }

  public navigateToNode(nodeId: string): void {
    if (!this.resolveNode(nodeId)) {
      throw new Error(`Node with ID ${nodeId} is not part of the workflow graph`);
    }

    this.nextNodeId = nodeId;
  }

  public navigateToNextNode(): void {
    this.nextNodeId = this.nodeAfter(this.currentNodeId);
  }

  public navigateToAfterNode(nodeId: string): void {
    this.nextNodeId = this.nodeAfter(nodeId);
  }

  public navigateToSynthetic(params: {
    stepId: string;
    nodeType: string;
    nodeId?: string;
    scopeId?: string;
  }): void {
    const ownerStack = this.ensureOwnerScope();
    const nextNodeId = params.nodeId ?? params.stepId;
    const scopeId = params.scopeId ?? params.stepId;
    const syntheticNodeData: SyntheticNodeData = {
      nodeId: nextNodeId,
      nodeType: params.nodeType,
      stepId: params.stepId,
      stackFrame: {
        stepId: params.stepId,
        nestedScopes: [
          {
            nodeId: nextNodeId,
            nodeType: params.nodeType,
            scopeId,
          },
        ],
      },
    };

    this.syntheticStackFramesMap.set(ownerStack.hash, syntheticNodeData);
    this.nextNodeId = nextNodeId;
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

  /**
   * The compiled node that minted the synthetic is the owner prefix on the stack.
   */
  private ensureOwnerScope(): WorkflowScopeStack {
    if (!this.currentNode) {
      throw new Error('Current scope is not set');
    }

    let stack = WorkflowScopeStack.fromStackFrames(this.stackFrames);
    if (stack.isEmpty() || stack.getCurrentScope().nodeId !== this.currentNode.id) {
      stack = stack.enterScope({
        nodeId: this.currentNode.id,
        nodeType: this.currentNode.type,
        stepId: this.currentNode.stepId,
      });
      this.stackFrames = stack.stackFrames;
    }

    return stack;
  }

  private nodeAfter(nodeId: string | undefined): string | undefined {
    const topologicalOrder = this.workflowGraph.topologicalOrder;
    const index = topologicalOrder.findIndex((id) => id === nodeId);
    if (index >= 0 && index < topologicalOrder.length - 1) {
      return topologicalOrder[index + 1];
    }
    return undefined;
  }

  private resolveNode(nodeId: string | undefined): GraphNodeUnion | null {
    if (!nodeId) {
      return null;
    }

    const syntheticNodeData = this.findSyntheticByNodeId(nodeId);
    if (syntheticNodeData) {
      return this.toSyntheticGraphNode(syntheticNodeData);
    }

    return this.workflowGraph.getNode(nodeId) ?? null;
  }

  private findSyntheticByNodeId(nodeId: string): SyntheticNodeData | undefined {
    for (const syntheticNodeData of this.syntheticStackFramesMap.values()) {
      if (syntheticNodeData.nodeId === nodeId) {
        return syntheticNodeData;
      }
    }
    return undefined;
  }

  private toSyntheticGraphNode(syntheticNodeData: SyntheticNodeData): GraphNodeUnion {
    return {
      id: syntheticNodeData.nodeId,
      type: syntheticNodeData.nodeType,
      stepId: syntheticNodeData.stepId,
      stepType: syntheticNodeData.nodeType,
    } as unknown as GraphNodeUnion;
  }

  /**
   * Rebuild the in-memory synthetic map from persisted stack frames.
   * A scope whose nodeId is not in the compiled graph is a synthetic.
   */
  private hydrateSyntheticMapFromStack(stackFrames: StackFrame[]): void {
    let compiled = new WorkflowScopeStack();

    for (const frame of stackFrames) {
      for (const nested of frame.nestedScopes) {
        if (!this.workflowGraph.getNode(nested.nodeId)) {
          this.syntheticStackFramesMap.set(compiled.hash, {
            nodeId: nested.nodeId,
            nodeType: nested.nodeType,
            stepId: frame.stepId,
            stackFrame: {
              stepId: frame.stepId,
              nestedScopes: [{ ...nested }],
            },
          });
        } else {
          compiled = compiled.enterScope({
            nodeId: nested.nodeId,
            nodeType: nested.nodeType,
            stepId: frame.stepId,
            scopeId: nested.scopeId,
          });
        }
      }
    }
  }

  private syncScopeStack(): void {
    if (!this.currentNodeId) {
      return;
    }

    const syntheticNodeData = this.findSyntheticByNodeId(this.currentNodeId);
    if (syntheticNodeData) {
      this.stackFrames = WorkflowScopeStack.fromStackFrames(this.stackFrames).enterScope({
        nodeId: syntheticNodeData.nodeId,
        nodeType: syntheticNodeData.nodeType,
        stepId: syntheticNodeData.stepId,
        scopeId: syntheticNodeData.stackFrame.nestedScopes[0].scopeId,
      }).stackFrames;
      return;
    }

    const scopesMap = new Map<string, string | undefined>();

    for (const scope of this.stackFrames) {
      for (const nestedScope of scope.nestedScopes) {
        scopesMap.set(nestedScope.nodeId, nestedScope.scopeId);
      }
    }

    const nodesStack = this.workflowGraph.getNodeStack(this.currentNodeId);

    let currentNodeScope = new WorkflowScopeStack();

    for (const nodeId of nodesStack) {
      const nodeFromGraph = this.workflowGraph.getNode(nodeId);

      currentNodeScope = currentNodeScope.enterScope({
        nodeId: nodeFromGraph.id,
        nodeType: nodeFromGraph.type,
        stepId: nodeFromGraph.stepId,
        scopeId: scopesMap.get(nodeFromGraph.id),
      });

      const attachedSynthetic = this.syntheticStackFramesMap.get(currentNodeScope.hash);
      if (attachedSynthetic) {
        currentNodeScope = currentNodeScope.enterScope({
          nodeId: attachedSynthetic.stackFrame.nestedScopes[0].nodeId,
          nodeType: attachedSynthetic.stackFrame.nestedScopes[0].nodeType,
          stepId: attachedSynthetic.stackFrame.stepId,
          scopeId: attachedSynthetic.stackFrame.nestedScopes[0].scopeId,
        });
      }
    }

    this.stackFrames = currentNodeScope.stackFrames;
  }
}
