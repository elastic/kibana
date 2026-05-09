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
import type { WorkflowExecutionState } from './workflow_execution_state';
import { WorkflowScopeStack } from './workflow_scope_stack';

export interface WorkflowExecutionDriverInit {
  workflowExecutionState: WorkflowExecutionState;
  workflowExecutionGraph: WorkflowGraph;
}

/**
 * Drives in-memory workflow step iteration: pending node navigation (`nextNodeId`),
 * whether the execution and persistence loops keep running (`isExecuting`), controlled with
 * {@link WorkflowExecutionDriver.start} and {@link WorkflowExecutionDriver.stop}.
 */
export class WorkflowExecutionDriver {
  private readonly workflowGraph: WorkflowGraph;
  private currentNodeId: string | undefined;
  private nextNodeId: string | undefined;
  private executing = false;
  private currentScopeStack: WorkflowScopeStack = WorkflowScopeStack.fromStackFrames([]);
  // private nextScopeStack: WorkflowScopeStack = WorkflowScopeStack.fromStackFrames([]);
  private currentScopeId: string | undefined;

  constructor(init: WorkflowExecutionDriverInit) {
    this.workflowGraph = init.workflowExecutionGraph;
    this.currentNodeId = this.workflowGraph.topologicalOrder[0];
  }

  public get isExecuting(): boolean {
    return this.executing;
  }

  /**
   * Starts the execution driver: execution and persistence loops run while `isExecuting` is true.
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

  handleStartOfCycle(): void {
    if (this.currentNode?.type.startsWith('exit-')) {
      this.currentScopeStack = this.currentScopeStack.exitScope();
    }
  }

  handleEndOfCycle(): void {
    // this.currentScopeStack = this.nextScopeStack;

    if (this.currentNode?.type.startsWith('enter-')) {
      this.currentScopeStack = this.currentScopeStack.enterScope({
        nodeId: this.currentNode.id,
        nodeType: this.currentNode.type,
        stepId: this.currentNode.stepId,
        scopeId: this.currentScopeId,
      });
    }

    if (!this.nextNodeId) {
      this.currentNodeId = undefined;
      return;
    }

    this.currentNodeId = this.nextNodeId;
    this.nextNodeId = undefined;
    this.currentScopeId = undefined;
  }

  public get currentNode(): GraphNodeUnion | null {
    if (!this.currentNodeId) {
      return null;
    }

    return this.workflowGraph.getNode(this.currentNodeId);
  }

  public get nextNode(): GraphNodeUnion | null {
    if (!this.nextNodeId) {
      return null;
    }

    return this.workflowGraph.getNode(this.nextNodeId);
  }

  public navigateToNode(nodeId: string): void {
    if (!this.workflowGraph.getNode(nodeId)) {
      throw new Error(`Node with ID ${nodeId} is not part of the workflow graph`);
    }

    this.nextNodeId = nodeId;
  }

  public navigateToNextNode(): void {
    // const workflowExecution = this.workflowExecutionState.getWorkflowExecution();
    // const currentNodeId = workflowExecution.currentNodeId;
    this.nextNodeId = this.nodeAfter(this.currentNodeId);
  }

  public navigateToAfterNode(nodeId: string): void {
    this.nextNodeId = this.nodeAfter(nodeId);
  }

  public get currentStackFrames(): StackFrame[] {
    // prevents consumer from modifying the stack frames in the current scope stack
    return WorkflowScopeStack.fromStackFrames(this.currentScopeStack.stackFrames).stackFrames;
  }

  /**
   * Enters a new scope in the workflow execution context.
   *
   * This method creates a new scope frame and pushes it onto the scope stack, establishing
   * a new execution context for nested workflow operations. Scopes are used to track
   * hierarchical execution contexts such as loops, conditionals, or sub-workflows.
   *
   * @param subScopeId - Optional identifier for the sub-scope being entered
   *
   * @remarks
   * This method includes a guard condition that prevents scope entry if the current node
   * is not an appropriate "enter" node. The scope update will be silently ignored if:
   * - The current node type does not start with 'enter' (e.g., 'enter-foreach', 'enter-if', etc)
   *
   * This guard ensures that scopes are only created at the correct workflow execution points,
   * maintaining the integrity of the execution context hierarchy.
   */
  public enterScope(subScopeId?: string): void {
    // this.currentScopeId = subScopeId;
    // if (!this.currentNode?.type.startsWith('enter-')) {
    //   return;
    // }
    // this.nextScopeStack = this.currentScopeStack.enterScope({
    //   nodeId: this.currentNode.id,
    //   nodeType: this.currentNode.type,
    //   stepId: this.currentNode.stepId,
    //   scopeId: subScopeId,
    // });
  }

  public exitScope(): void {
    // if (!this.currentNode?.type.startsWith('exit-')) {
    //   return;
    // }
    // if (this.currentScopeStack.isEmpty()) {
    //   return;
    // }
    // const entered = this.currentNode.type.replace(/^exit-/, 'enter-');
    // if (entered !== this.currentScopeStack.getCurrentScope().nodeType) {
    //   return;
    // }
    // this.nextScopeStack = this.currentScopeStack.exitScope();
  }

  public setCurrentScopeId(scopeId?: string): void {
    this.currentScopeId = scopeId;
  }

  private nodeAfter(nodeId: string | undefined): string | undefined {
    const topologicalOrder = this.workflowGraph.topologicalOrder;
    const index = topologicalOrder.findIndex((id) => id === nodeId);
    if (index >= 0 && index < topologicalOrder.length - 1) {
      return topologicalOrder[index + 1];
    }
    return undefined;
  }
}
