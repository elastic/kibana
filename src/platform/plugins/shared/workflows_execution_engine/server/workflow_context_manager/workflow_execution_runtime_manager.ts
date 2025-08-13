/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsWorkflowExecution, EsWorkflowStepExecution, ExecutionStatus } from '@kbn/workflows';
import { graphlib } from '@dagrejs/dagre';
import { RunStepResult } from '../step/step_base';
import { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import { WorkflowExecutionState } from './workflow_execution_state';

interface WorkflowExecutionRuntimeManagerInit {
  workflowExecutionState: WorkflowExecutionState;
  workflowExecution: EsWorkflowExecution;
  workflowExecutionGraph: graphlib.Graph;
  workflowLogger: IWorkflowEventLogger;
}

/**
 * Manages the runtime execution state of a workflow, including step execution, results, and transitions.
 *
 * The `WorkflowExecutionRuntimeManager` class is responsible for orchestrating the execution of workflow steps,
 * tracking their statuses, results, and runtime states, and updating the overall workflow execution status.
 * It maintains the topological order of steps, supports step navigation, and interacts with repositories to persist
 * execution data.
 *
 * Key responsibilities:
 * - Tracks execution status, results, and runtime state for each workflow step.
 * - Navigates between steps according to topological order, skipping steps as needed.
 * - Initiates and finalizes step and workflow executions, updating persistent storage.
 * - Handles workflow completion and error propagation.
 *
 * @remarks
 * This class assumes that workflow steps are represented as nodes in a directed acyclic graph (DAG),
 * and uses topological sorting to determine execution order.
 */
export class WorkflowExecutionRuntimeManager {
  private currentStepIndex: number = -1;
  private topologicalOrder: string[];
  private workflowLogger: IWorkflowEventLogger | null = null;

  private workflowExecutionState: WorkflowExecutionState;
  private workflowExecutionGraph: graphlib.Graph;

  constructor(workflowExecutionRuntimeManagerInit: WorkflowExecutionRuntimeManagerInit) {
    this.workflowExecutionGraph = workflowExecutionRuntimeManagerInit.workflowExecutionGraph;
    this.topologicalOrder = graphlib.alg.topsort(this.workflowExecutionGraph);
    this.workflowLogger = workflowExecutionRuntimeManagerInit.workflowLogger;
    this.workflowExecutionState = workflowExecutionRuntimeManagerInit.workflowExecutionState;
  }

  public getWorkflowExecutionStatus(): ExecutionStatus {
    return this.workflowExecutionState.getWorkflowExecution().status;
  }

  public getWorkflowExecution(): EsWorkflowExecution {
    return this.workflowExecutionState.getWorkflowExecution();
  }

  public getNodeSuccessors(nodeId: string): any[] {
    const successors = this.workflowExecutionGraph.successors(nodeId);

    if (!successors) {
      return [];
    }

    return successors.map((successorId) => this.workflowExecutionGraph.node(successorId)) as any[];
  }

  // TODO: To rename to getCurrentNode and use proper type
  public getCurrentStep(): any {
    // must be a proper type
    if (this.currentStepIndex < 0 || this.currentStepIndex >= this.topologicalOrder.length) {
      return null; // No current step
    }
    const currentStepId = this.topologicalOrder[this.currentStepIndex];
    return this.workflowExecutionGraph.node(currentStepId);
  }

  // TODO: To rename to goToNode
  public goToStep(stepId: string): void {
    this.currentStepIndex = this.topologicalOrder.findIndex((id) => id === stepId);
  }

  // TODO: To rename to goToNextNode
  public goToNextStep(): void {
    if (this.currentStepIndex < this.topologicalOrder.length - 1) {
      for (let i = this.currentStepIndex + 1; i < this.topologicalOrder.length; i++) {
        const nextStepId = this.topologicalOrder[i];
        if (
          this.workflowExecutionState.getStepExecution(nextStepId)?.status !==
          ExecutionStatus.SKIPPED
        ) {
          this.currentStepIndex = i;
          return;
        }
      }
      return;
    }

    this.currentStepIndex = -1;
  }

  public getStepResult(stepId: string): RunStepResult | undefined {
    const stepExecution = this.workflowExecutionState.getStepExecution(stepId);

    if (!stepExecution) {
      return undefined;
    }

    return {
      output: stepExecution.output || {},
      error: stepExecution.error,
    };
  }

  public async setStepResult(stepId: string, result: RunStepResult): Promise<void> {
    this.workflowExecutionState.upsertStep({
      stepId,
      output: result.output,
      error: result.error,
    });
  }

  public getStepState(stepId: string): Record<string, any> | undefined {
    const stepExecution = this.workflowExecutionState.getStepExecution(stepId);

    if (!stepExecution) {
      return undefined;
    }

    return stepExecution.state;
  }

  public async setStepState(stepId: string, state: Record<string, any> | undefined): Promise<void> {
    this.workflowExecutionState.upsertStep({
      stepId,
      state,
    });
  }

  public getStepStatus(stepId: string): ExecutionStatus {
    const stepExecution = this.workflowExecutionState.getStepExecution(stepId);

    if (!stepExecution) {
      throw new Error(`WorkflowRuntime: Step execution not found for step ID: ${stepId}`);
    }

    return stepExecution.status;
  }

  public async startStep(stepId: string): Promise<void> {
    const nodeId = stepId;
    const stepStartedAt = new Date();

    const stepExecution = {
      stepId: nodeId,
      topologicalIndex: this.topologicalOrder.findIndex((id) => id === stepId),
      status: ExecutionStatus.RUNNING,
      startedAt: stepStartedAt.toISOString(),
    } as Partial<EsWorkflowStepExecution>;

    this.workflowExecutionState.upsertStep(stepExecution);
    this.logStepStart(stepId);
    // TODO: To think what to do here
    await this.workflowExecutionState.flush();
  }

  public async finishStep(stepId: string): Promise<void> {
    const startedStepExecution = this.workflowExecutionState.getStepExecution(stepId);

    if (!startedStepExecution) {
      throw new Error(`WorkflowRuntime: Step execution not found for step ID: ${stepId}`);
    }

    const stepStatus = startedStepExecution.error
      ? ExecutionStatus.FAILED
      : ExecutionStatus.COMPLETED;
    const completedAt = new Date();
    const executionTimeMs =
      completedAt.getTime() - new Date(startedStepExecution.startedAt).getTime();
    const stepExecutionUpdate = {
      id: startedStepExecution.id,
      stepId: startedStepExecution.stepId,
      status: stepStatus,
      completedAt: completedAt.toISOString(),
      executionTimeMs,
      error: startedStepExecution.error,
      output: startedStepExecution.output,
    } as Partial<EsWorkflowStepExecution>;

    this.workflowExecutionState.upsertStep(stepExecutionUpdate);
    this.logStepComplete(stepExecutionUpdate);
  }

  public async skipSteps(stepIds: string[]): Promise<void> {
    const toSave = stepIds.map((stepId) => {
      return {
        stepId,
        topologicalIndex: this.topologicalOrder.indexOf(stepId),
        status: ExecutionStatus.SKIPPED,
      } as Partial<EsWorkflowStepExecution>;
    });

    toSave.forEach((stepExecution) => this.workflowExecutionState.upsertStep(stepExecution));
  }

  public async setWaitStep(stepId: string): Promise<void> {
    this.workflowExecutionState.upsertStep({
      stepId,
      status: ExecutionStatus.WAITING_FOR_INPUT,
    });

    this.workflowExecutionState.updateWorkflowExecution({
      status: ExecutionStatus.WAITING_FOR_INPUT,
    });
  }

  public async start(): Promise<void> {
    this.currentStepIndex = 0;
    const updatedWorkflowExecution: Partial<EsWorkflowExecution> = {
      status: ExecutionStatus.RUNNING,
      currentNodeId: this.topologicalOrder[this.currentStepIndex],
      startedAt: new Date().toISOString(),
    };
    this.workflowExecutionState.updateWorkflowExecution(updatedWorkflowExecution);
    this.logWorkflowStart();
    await this.workflowExecutionState.flush();
  }

  public async resume(): Promise<void> {
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();
    this.currentStepIndex = this.topologicalOrder.findIndex(
      (nodeId) => nodeId === workflowExecution.currentNodeId
    );
    await this.workflowExecutionState.load();
    const updatedWorkflowExecution: Partial<EsWorkflowExecution> = {
      status: ExecutionStatus.RUNNING,
    };
    this.workflowExecutionState.updateWorkflowExecution(updatedWorkflowExecution);
  }

  public async saveState(): Promise<void> {
    const workflowExecutionUpdate: Partial<EsWorkflowExecution> = {
      currentNodeId: this.getCurrentStep()?.id,
    };
    const workflowExecution = this.workflowExecutionState.getWorkflowExecution();

    if (
      this.workflowExecutionState.getStepExecution(
        this.topologicalOrder[this.topologicalOrder.length - 1]
      )
    ) {
      workflowExecutionUpdate.status = ExecutionStatus.COMPLETED;
    }

    const workflowError = this.getCurrentStepError();

    if (workflowError) {
      workflowExecutionUpdate.status = ExecutionStatus.FAILED;
      workflowExecutionUpdate.error = workflowError;
    }

    if (
      [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED].includes(
        workflowExecutionUpdate.status as ExecutionStatus
      )
    ) {
      const startedAt = new Date(workflowExecution.startedAt);
      const completeDate = new Date();
      workflowExecutionUpdate.finishedAt = completeDate.toISOString();
      workflowExecutionUpdate.duration = completeDate.getTime() - startedAt.getTime();
      this.logWorkflowComplete(workflowExecutionUpdate.status === ExecutionStatus.COMPLETED);
    }

    this.workflowExecutionState.updateWorkflowExecution(workflowExecutionUpdate);
    await this.workflowExecutionState.flush();
  }

  private getCurrentStepError(): any | undefined {
    const currentStepId = this.topologicalOrder[this.currentStepIndex];
    const currentStepResult = this.getStepResult(currentStepId) || ({} as RunStepResult);

    if (currentStepResult.error) {
      return currentStepResult.error;
    }

    return undefined;
  }

  private logWorkflowStart(): void {
    this.workflowLogger?.logInfo('Workflow execution started', {
      event: { action: 'workflow-start', category: ['workflow'] },
      tags: ['workflow', 'execution', 'start'],
    });
  }

  private logWorkflowComplete(success: boolean): void {
    this.workflowLogger?.logInfo(
      `Workflow execution ${success ? 'completed successfully' : 'failed'}`,
      {
        event: {
          action: 'workflow-complete',
          category: ['workflow'],
          outcome: success ? 'success' : 'failure',
        },
        tags: ['workflow', 'execution', 'complete'],
      }
    );
  }

  private logStepStart(stepId: string): void {
    const node = this.workflowExecutionGraph.node(stepId) as any;
    const stepName = node?.name || stepId;
    this.workflowLogger?.logInfo(`Step '${stepName}' started`, {
      event: { action: 'step-start', category: ['workflow', 'step'] },
      tags: ['workflow', 'step', 'start'],
    });
  }

  private logStepComplete(step: Partial<EsWorkflowStepExecution>): void {
    const node = this.workflowExecutionGraph.node(step.stepId as string) as any;
    const stepName = node?.name || step.stepId;
    const isSuccess = step?.status === ExecutionStatus.COMPLETED;
    this.workflowLogger?.logInfo(`Step '${stepName}' ${isSuccess ? 'completed' : 'failed'}`, {
      event: {
        action: 'step-complete',
        category: ['workflow', 'step'],
        outcome: isSuccess ? 'success' : 'failure',
      },
      tags: ['workflow', 'step', 'complete'],
    });
  }
}
