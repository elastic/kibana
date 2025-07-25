/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { EsWorkflowExecution, EsWorkflowStepExecution, ExecutionStatus } from '@kbn/workflows';
import { graphlib } from '@dagrejs/dagre';
import { WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';
import { RunStepResult } from '../step/step_base';

export class WorkflowExecutionState {
  private stepExecutions: Map<string, EsWorkflowStepExecution> = new Map();
  private stepResults: Map<string, RunStepResult> = new Map();
  private stepStates: Map<string, Record<string, any> | undefined> = new Map();
  private workflowStartedAt: Date | undefined = undefined;
  private currentStepIndex: number = 0;
  private topologicalOrder: string[];

  constructor(
    private workflowExecution: EsWorkflowExecution,
    private esClient: ElasticsearchClient,
    private workflowExecutionGraph: graphlib.Graph
  ) {
    this.topologicalOrder = graphlib.alg.topsort(this.workflowExecutionGraph);
  }

  public getWorkflowExecutionStatus(): ExecutionStatus {
    return this.workflowExecution.status;
  }

  public getCurrentStep(): any {
    // must be a proper type
    if (this.currentStepIndex < 0 || this.currentStepIndex >= this.topologicalOrder.length) {
      return null; // No current step
    }
    const currentStepId = this.topologicalOrder[this.currentStepIndex];
    return this.workflowExecutionGraph.node(currentStepId);
  }

  public goToStep(stepId: string): void {
    this.currentStepIndex = this.topologicalOrder.findIndex((id) => id === stepId);
  }

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
    const workflowId = 'anything'; // Replace with actual workflow ID
    const workflowRunId = this.workflowExecution.id;
    const nodeId = stepId;
    const workflowStepExecutionId = `${workflowRunId}-${nodeId}`;
    const stepStartedAt = new Date();
    const stepExecution = {
      id: workflowStepExecutionId,
      workflowId, // Replace with actual workflow ID
      workflowRunId,
      stepId: nodeId,
      topologicalIndex: 0, // TODO: this.topologicalOrder.indexOf(stepId),
      status: ExecutionStatus.RUNNING,
      startedAt: stepStartedAt.toISOString(),
    } as Partial<EsWorkflowStepExecution>;

    await this.esClient?.index({
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      id: workflowStepExecutionId,
      refresh: true,
      document: stepExecution,
    });
    this.stepExecutions.set(nodeId, stepExecution as EsWorkflowStepExecution);
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
      status: stepStatus,
      completedAt: completedAt.toISOString(),
      executionTimeMs,
      error: stepResult.error,
      output: stepResult.output,
    } as Partial<EsWorkflowStepExecution>;
    await this.esClient?.update({
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      id: startedStepExecution.id,
      refresh: true,
      doc: stepExecutionUpdate,
    });
    this.stepExecutions.set(stepId, {
      ...startedStepExecution,
      ...stepExecutionUpdate,
    } as EsWorkflowStepExecution);

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
        topologicalIndex: 0, // TODO: this.topologicalOrder.indexOf(stepId),
        status: ExecutionStatus.SKIPPED,
      } as Partial<EsWorkflowStepExecution>;
    });

    await this.esClient?.bulk({
      refresh: true,
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      body: toSave.flatMap((doc) => [{ update: { _id: doc.id } }, { doc }]),
    });
    toSave.forEach((workflowExecution) => {
      this.stepExecutions.set(
        workflowExecution.stepId as string,
        workflowExecution as EsWorkflowStepExecution
      );
    });
  }

  public async startWorkflow(): Promise<void> {
    const updatedWorkflowExecution: Partial<EsWorkflowExecution> = {
      id: this.workflowExecution.id,
      status: ExecutionStatus.RUNNING,
      startedAt: new Date().toISOString(),
    };
    await this.esClient.index({
      index: WORKFLOWS_EXECUTIONS_INDEX,
      id: this.workflowExecution.id,
      refresh: true,
      document: updatedWorkflowExecution,
    });
    this.workflowExecution = {
      ...this.workflowExecution,
      ...updatedWorkflowExecution,
    };
  }

  public async finishWorkflow(): Promise<void> {
    const updatedWorkflowExecution: Partial<EsWorkflowExecution> = {
      id: this.workflowExecution.id,
      status: ExecutionStatus.RUNNING,
      startedAt: this.workflowStartedAt?.toISOString(),
    };
    await this.esClient.index({
      index: WORKFLOWS_EXECUTIONS_INDEX,
      id: this.workflowExecution.id,
      refresh: true,
      document: updatedWorkflowExecution,
    });
    this.workflowExecution = {
      ...this.workflowExecution,
      ...updatedWorkflowExecution,
    };
  }

  private async updateWorkflowState(): Promise<void> {
    const workflowExecutionUpdate: Partial<EsWorkflowExecution> = {};

    if (this.isWorkflowFinished()) {
      workflowExecutionUpdate.status = ExecutionStatus.COMPLETED;
    }
    const currentStepError = this.getCurrentStepError();

    if (currentStepError) {
      workflowExecutionUpdate.status = ExecutionStatus.FAILED;
      workflowExecutionUpdate.error = currentStepError;
    }

    if (
      [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED].includes(
        workflowExecutionUpdate.status as ExecutionStatus
      )
    ) {
      const startedAt = new Date(this.workflowExecution.startedAt);
      const completeDate = new Date();
      workflowExecutionUpdate.finishedAt = completeDate.toISOString();
      workflowExecutionUpdate.duration = completeDate.getTime() - (startedAt.getTime() || 0);
      await this.esClient.index({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        id: this.workflowExecution.id,
        refresh: true,
        document: workflowExecutionUpdate,
      });
    }

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
}
