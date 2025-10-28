/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { WaitGraphNode } from '@kbn/workflows/graph';
import { parseDuration } from '../../utils';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { WorkflowTaskManager } from '../../workflow_task_manager/workflow_task_manager';
import type { NodeImplementation } from '../node_implementation';

export class WaitStepImpl implements NodeImplementation {
  private static readonly SHORT_DURATION_THRESHOLD = 1000 * 5; // 5 seconds
  private durationCache: number | null = null;

  constructor(
    private node: WaitGraphNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger,
    private workflowTaskManager: WorkflowTaskManager
  ) {}

  async run(): Promise<void> {
    if (this.getDurationInMs() > WaitStepImpl.SHORT_DURATION_THRESHOLD) {
      await this.handleLongDuration();
      return;
    }

    await this.handleShortDuration();
  }

  private getDurationInMs(): number {
    if (typeof this.durationCache === 'number') {
      return this.durationCache;
    }

    return (this.durationCache = parseDuration(this.node.configuration.with.duration));
  }

  public async handleShortDuration(): Promise<void> {
    await this.stepExecutionRuntime.startStep();
    this.logStartWait();
    const durationInMs = this.getDurationInMs();
    await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(resolve, durationInMs);
      this.stepExecutionRuntime.abortController.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Wait step was aborted'));
      });
    });
    this.logFinishWait();
    await this.stepExecutionRuntime.finishStep();
    this.workflowRuntime.navigateToNextNode();
  }

  public handleLongDuration(): Promise<void> {
    const stepState = this.stepExecutionRuntime.getCurrentStepState();

    if (stepState?.resumeExecutionTaskId) {
      return this.exitLongWait();
    }

    return this.enterLongWait();
  }

  private async enterLongWait(): Promise<void> {
    const durationInMs = this.getDurationInMs();
    await this.stepExecutionRuntime.startStep();
    const workflowExecution = this.workflowRuntime.getWorkflowExecution();
    const runAt = new Date(new Date().getTime() + durationInMs);
    const resumeExecutionTask = await this.workflowTaskManager.scheduleResumeTask({
      runAt,
      workflowRunId: workflowExecution.id,
      spaceId: workflowExecution.spaceId,
    });
    this.workflowLogger.logDebug(
      `Scheduled resume execution task for wait step "${this.node.id}" with ID ${
        resumeExecutionTask.taskId
      }.\nExecution will resume at ${runAt.toISOString()}`
    );
    await this.stepExecutionRuntime.setCurrentStepState({
      resumeExecutionTaskId: resumeExecutionTask.taskId,
    });
    this.logStartWait();
    await this.stepExecutionRuntime.setWaitStep();
  }

  private async exitLongWait(): Promise<void> {
    await this.stepExecutionRuntime.setCurrentStepState(undefined);
    this.workflowLogger.logDebug(
      `Resuming execution of wait step "${this.node.id}" after long wait.`
    );
    this.logFinishWait();
    await this.stepExecutionRuntime.finishStep();
    this.workflowRuntime.navigateToNextNode();
  }

  private logStartWait(): void {
    this.workflowLogger.logInfo(
      `Waiting for ${this.node.configuration.with.duration} in step ${this.node.id}`
    );
  }

  private logFinishWait(): void {
    this.workflowLogger.logInfo(
      `Finished waiting for ${this.node.configuration.with.duration} in step ${this.node.id}`
    );
  }
}
