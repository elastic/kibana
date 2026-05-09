/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GraphNodeUnion, WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowExecutionState } from './workflow_execution_state';

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
  private readonly workflowExecutionState: WorkflowExecutionState;
  private readonly workflowGraph: WorkflowGraph;
  private currentNodeId: string | undefined;
  private nextNodeId: string | undefined;
  private executing = false;

  constructor(init: WorkflowExecutionDriverInit) {
    this.workflowExecutionState = init.workflowExecutionState;
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

  handleEndOfCycle(): void {
    if (!this.nextNodeId) {
      this.currentNodeId = undefined;
      return;
    }

    this.currentNodeId = this.nextNodeId;
    this.nextNodeId = undefined;
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
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();
    const currentNodeId = workflowExecution.currentNodeId;
    this.nextNodeId = this.nodeAfter(currentNodeId as string | undefined);
  }

  public navigateToAfterNode(nodeId: string): void {
    this.nextNodeId = this.nodeAfter(nodeId);
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
