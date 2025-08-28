/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { WaitGraphNode } from '@kbn/workflows';
import type { StepImplementation } from '../step_base';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { WorkflowTaskManager } from '../../workflow_task_manager/workflow_task_manager';

export class WaitStepImpl implements StepImplementation {
  private static readonly SHORT_DURATION_THRESHOLD = 1000 * 5; // 5 seconds
  private durationCache: number | null = null;

  constructor(
    private node: WaitGraphNode,
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

    return (this.durationCache = this.parseDuration(this.node.configuration.with.duration));
  }

  public async handleShortDuration(): Promise<void> {
    await this.workflowRuntime.startStep(this.node.id);
    this.logStartWait();
    const durationInMs = this.getDurationInMs();
    await new Promise((resolve) => setTimeout(resolve, durationInMs));
    this.logFinishWait();
    await this.workflowRuntime.finishStep(this.node.id);
    this.workflowRuntime.goToNextStep();
  }

  public handleLongDuration(): Promise<void> {
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
    await this.workflowRuntime.setStepState(this.node.id, {
      resumeExecutionTaskId: resumeExecutionTask.taskId,
    });
    this.logStartWait();
    await this.workflowRuntime.setWaitStep(this.node.id);
  }

  private async exitLongWait(): Promise<void> {
    await this.workflowRuntime.setStepState(this.node.id, undefined);
    this.workflowLogger.logDebug(
      `Resuming execution of wait step "${this.node.id}" after long wait.`
    );
    this.logFinishWait();
    await this.workflowRuntime.finishStep(this.node.id);
    this.workflowRuntime.goToNextStep();
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
    // Regular expression to validate the duration format and order (w, d, h, m, s, ms)
    const validDurationRegex = /^(?:(\d+w)?(\d+d)?(\d+h)?(\d+m)?(\d+s)?(\d+ms)?)$/;
    const orderValidationRegex = /^(?:\d+w)?(?:\d+d)?(?:\d+h)?(?:\d+m)?(?:\d+s)?(?:\d+ms)?$/;

    if (
      !duration ||
      typeof duration !== 'string' ||
      !validDurationRegex.test(duration) ||
      !orderValidationRegex.test(duration)
    ) {
      throw new Error(
        `Invalid duration format: ${duration}. Use format like "1w2d3h4m5s6ms" with units in descending order.`
      );
    }

    const durationComponentsRegex = /(\d+)(ms|s|m|h|d|w)(?![a-zA-Z])/g;
    let match;
    while ((match = durationComponentsRegex.exec(duration)) !== null) {
      const value = Number(match[1]);
      const unit = match[2];
      const multiplier = units[unit as keyof typeof units];
      total += value * multiplier;
    }
    return total;
  }
}
