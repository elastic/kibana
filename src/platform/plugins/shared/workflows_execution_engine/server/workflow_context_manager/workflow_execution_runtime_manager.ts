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
import { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import { StepExecutionRepository } from '../repositories/step_execution_repository';
import { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';

interface WorkflowExecutionRuntimeManagerInit {
  workflowExecution: EsWorkflowExecution;
  workflowExecutionRepository: WorkflowExecutionRepository;
  stepExecutionRepository: StepExecutionRepository;
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
  private stepExecutions: Map<string, EsWorkflowStepExecution> = new Map();
  private stepResults: Map<string, RunStepResult> = new Map();
  private stepStates: Map<string, Record<string, any> | undefined> = new Map();
  private currentStepIndex: number = 0;
  private topologicalOrder: string[];
  // private contextManager?: IWorkflowContextLogger;
  private workflowLogger: IWorkflowEventLogger | null = null;

  public workflowExecution: EsWorkflowExecution;
  private workflowExecutionRepository: WorkflowExecutionRepository;
  private stepExecutionRepository: StepExecutionRepository;
  private workflowExecutionGraph: graphlib.Graph;

  constructor(workflowExecutionRuntimeManagerInit: WorkflowExecutionRuntimeManagerInit) {
    this.workflowExecution = workflowExecutionRuntimeManagerInit.workflowExecution;
    this.workflowExecutionRepository =
      workflowExecutionRuntimeManagerInit.workflowExecutionRepository;
    this.stepExecutionRepository = workflowExecutionRuntimeManagerInit.stepExecutionRepository;
    this.workflowExecutionGraph = workflowExecutionRuntimeManagerInit.workflowExecutionGraph;
    this.topologicalOrder = graphlib.alg.topsort(this.workflowExecutionGraph);
    this.workflowLogger = workflowExecutionRuntimeManagerInit.workflowLogger;
  }

  public getWorkflowExecutionStatus(): ExecutionStatus {
    return this.workflowExecution.status;
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
        if (this.stepExecutions.get(nextStepId)?.status !== ExecutionStatus.SKIPPED) {
          this.currentStepIndex = i;
          return;
        }
      }
      return;
    }

    this.currentStepIndex = -1;
  }

  public getStepResult(stepId: string): RunStepResult | undefined {
    return this.stepResults.get(stepId);
  }

  public async setStepResult(stepId: string, result: RunStepResult): Promise<void> {
    this.stepResults.set(stepId, result);
  }

  public getStepState(stepId: string): Record<string, any> | undefined {
    return this.stepStates.get(stepId);
  }

  public getStepStatus(stepId: string): ExecutionStatus | undefined {
    const stepExecution = this.stepExecutions.get(stepId);
    return stepExecution ? stepExecution.status : undefined;
  }

  public async setStepState(stepId: string, state: Record<string, any> | undefined): Promise<void> {
    this.stepStates.set(stepId, state);
  }

  public async startStep(stepId: string): Promise<void> {
    const workflowRunId = this.workflowExecution.id;
    const nodeId = stepId;
    const workflowStepExecutionId = `${workflowRunId}-${nodeId}`;
    const stepStartedAt = new Date();

    const stepExecution = {
      id: workflowStepExecutionId,
      workflowId: this.workflowExecution.workflowId,
      workflowRunId,
      stepId: nodeId,
      topologicalIndex: this.topologicalOrder.findIndex((id) => id === stepId),
      status: ExecutionStatus.RUNNING,
      startedAt: stepStartedAt.toISOString(),
    } as Partial<EsWorkflowStepExecution>;

    await this.stepExecutionRepository.createStepExecution(stepExecution);
    this.stepExecutions.set(nodeId, stepExecution as EsWorkflowStepExecution);
    this.logStepStart(stepId);
  }

  public async finishStep(stepId: string): Promise<void> {
    const startedStepExecution = this.stepExecutions.get(stepId);
    const stepResult: RunStepResult = this.stepResults.get(stepId) || {
      error: undefined,
      output: undefined,
    };

    if (!startedStepExecution) {
      throw new Error(`Step execution not found for step ID: ${stepId}`);
    }

    const stepStatus = stepResult.error ? ExecutionStatus.FAILED : ExecutionStatus.COMPLETED;
    const completedAt = new Date();
    const executionTimeMs =
      completedAt.getTime() - new Date(startedStepExecution.startedAt).getTime();
    const stepExecutionUpdate = {
      id: startedStepExecution.id,
      status: stepStatus,
      completedAt: completedAt.toISOString(),
      executionTimeMs,
      error: stepResult.error,
      output: stepResult.output,
    } as Partial<EsWorkflowStepExecution>;

    await this.stepExecutionRepository.updateStepExecution(stepExecutionUpdate);
    this.stepExecutions.set(stepId, {
      ...startedStepExecution,
      ...stepExecutionUpdate,
    } as EsWorkflowStepExecution);
    this.logStepComplete(stepId);

    await this.updateWorkflowState();

    // If the currentStepIndex has not explicitly changed (by a node), go to the next step
    if (this.currentStepIndex === this.topologicalOrder.indexOf(stepId)) {
      this.goToNextStep();
    }
  }

  public async skipSteps(stepIds: string[]): Promise<void> {
    const toSave = stepIds.map((stepId) => {
      const workflowStepExecutionId = `${this.workflowExecution.id}-${stepId}`;
      return {
        id: workflowStepExecutionId,
        workflowRunId: this.workflowExecution.id,
        stepId,
        topologicalIndex: this.topologicalOrder.indexOf(stepId),
        status: ExecutionStatus.SKIPPED,
      } as Partial<EsWorkflowStepExecution>;
    });

    await this.stepExecutionRepository.updateStepExecutions(toSave);
    toSave.forEach((stepExecution) => {
      this.stepExecutions.set(
        stepExecution.stepId as string,
        stepExecution as EsWorkflowStepExecution
      );
    });
  }

  public async start(): Promise<void> {
    const updatedWorkflowExecution: Partial<EsWorkflowExecution> = {
      id: this.workflowExecution.id,
      status: ExecutionStatus.RUNNING,
      startedAt: new Date().toISOString(),
      workflowId: this.workflowExecution.workflowId,
    };
    await this.workflowExecutionRepository.updateWorkflowExecution(updatedWorkflowExecution);
    this.workflowExecution = {
      ...this.workflowExecution,
      ...updatedWorkflowExecution,
    };
    this.logWorkflowStart();
  }

  public async fail(error: any): Promise<void> {
    await this.updateWorkflowState(error);
  }

  private async updateWorkflowState(error: any): Promise<void> {
    const workflowExecutionUpdate: Partial<EsWorkflowExecution> = {
      id: this.workflowExecution.id,
      workflowId: this.workflowExecution.workflowId,
      startedAt: this.workflowExecution.startedAt,
    };

    if (this.isWorkflowFinished()) {
      workflowExecutionUpdate.status = ExecutionStatus.COMPLETED;
    }
    const workflowError = error || this.getCurrentStepError();

    if (workflowError) {
      workflowExecutionUpdate.status = ExecutionStatus.FAILED;
      workflowExecutionUpdate.error = workflowError;
    }

    if (
      [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED].includes(
        workflowExecutionUpdate.status as ExecutionStatus
      )
    ) {
      const startedAt = new Date(this.workflowExecution.startedAt);
      const completeDate = new Date();
      workflowExecutionUpdate.finishedAt = completeDate.toISOString();
      workflowExecutionUpdate.duration = completeDate.getTime() - startedAt.getTime();
      this.logWorkflowComplete(workflowExecutionUpdate.status === ExecutionStatus.COMPLETED);
    }

    // TODO: Consider saving runtime state to workflow execution document

    await this.workflowExecutionRepository.updateWorkflowExecution(workflowExecutionUpdate);
    this.workflowExecution = {
      ...this.workflowExecution,
      ...workflowExecutionUpdate,
    };
  }

  private isWorkflowFinished(): boolean {
    if (this.currentStepIndex === this.topologicalOrder.length - 1) {
      return true;
    }

    return false;
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

  private logStepComplete(stepId: string): void {
    const node = this.workflowExecutionGraph.node(stepId) as any;
    const stepName = node?.name || stepId;
    const workflowStep = this.stepExecutions.get(stepId);
    const isSuccess = workflowStep?.status === ExecutionStatus.COMPLETED;
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
