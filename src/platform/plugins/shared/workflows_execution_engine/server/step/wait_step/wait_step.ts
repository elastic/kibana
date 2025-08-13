/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { StepImplementation } from '../step_base';
import { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import { WorkflowTaskManager } from '../../workflow_task_manager/workflow_task_manager';

export class WaitStepImpl implements StepImplementation {
  private durationCache: number | null = null;

  constructor(
    private node: any,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger,
    private workflowTaskManager: WorkflowTaskManager
  ) {}

  async run(): Promise<void> {
    if (this.getDurationInMs() > 1000 * 2) {
      await this.handleLongDuration();
      return;
    }

    this.handleShortDuration();
  }

  private getDurationInMs(): number {
    if (typeof this.durationCache === 'number') {
      return this.durationCache;
    }

    if (typeof this.node.configuration.with.duration === 'number') {
      return (this.durationCache = this.node.configuration.with.duration);
    }

    return (this.durationCache = this.parseDuration(this.node.configuration.with.duration));
  }

  private async handleShortDuration(): Promise<void> {
    await this.workflowRuntime.startStep(this.node.id);
    this.logStartWait();
    await new Promise((resolve) => setTimeout(resolve, this.getDurationInMs()));
    this.logFinishWait();
    await this.workflowRuntime.finishStep(this.node.id);
  }

  private handleLongDuration(): Promise<void> {
    const stepState = this.workflowRuntime.getStepState(this.node.id);

    if (stepState?.resumeExecutionTaskId) {
      return this.exitLongWait();
    }

    return this.enterLongWait();
  }

  private async enterLongWait(): Promise<void> {
    const durationInMs = this.getDurationInMs();
    await this.workflowRuntime.startStep(this.node.id);
    const workflowExecution = this.workflowRuntime.getWorkflowExecution();
    const resumeExecutionTask = await this.workflowTaskManager.scheduleResumeTask({
      runAt: new Date(new Date().getTime() + durationInMs),
      workflowRunId: workflowExecution.id,
    });

    await this.workflowRuntime.setStepState(this.node.id, {
      resumeExecutionTaskId: resumeExecutionTask.taskId,
    });
    this.logStartWait();
    await this.workflowRuntime.setWaitStep(this.node.id);
  }

  private async exitLongWait(): Promise<void> {
    await this.workflowRuntime.setStepState(this.node.id, undefined);
    this.logFinishWait();
    await this.workflowRuntime.finishStep(this.node.id);
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

  private parseDuration(duration: string): number {
    const units = {
      ms: 1,
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
    };

    let total = 0;
    const regex = /(\d+)(ms|[smhdw])/g;
    let match;
    while ((match = regex.exec(duration)) !== null) {
      const value = Number(match[1]);
      const unit = match[2];
      const multiplier = units[unit as keyof typeof units];
      total += value * multiplier;
    }
    return total;
  }
}
