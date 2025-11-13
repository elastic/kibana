/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ResumeWorkflowExecutionParams } from './types';
import { parseDuration } from '../utils';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';

export class WorkflowTask {
  private static readonly SHORT_DURATION_THRESHOLD = 1000 * 5; // 5 seconds

  constructor(
    private deps: {
      taskManager: TaskManagerStartContract;
      workflowExecutionRuntimeManager: WorkflowExecutionRuntimeManager;
      stepExecutionRuntime: StepExecutionRuntime;
    }
  ) {}

  async delay(duration: string): Promise<void> {
    const durationMs = parseDuration(duration);

    if (durationMs > WorkflowTask.SHORT_DURATION_THRESHOLD) {
      await this.handleLongDelay();
      return;
    }

    await this.handleShortDelay();
  }

  async scheduleResumeTask({
    runAt,
    workflowRunId,
    spaceId,
  }: {
    runAt: Date;
    workflowRunId: string;
    spaceId: string;
  }): Promise<{ taskId: string }> {
    const task = await this.deps.taskManager.schedule({
      taskType: 'workflow:resume',
      params: {
        workflowRunId,
        spaceId,
      } as ResumeWorkflowExecutionParams,
      state: {},
      runAt,
    });

    return {
      taskId: task.id,
    };
  }

  private async handleLongDelay(): Promise<void> {}

  private async handleShortDelay(): Promise<void> {

  }
}
