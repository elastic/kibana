/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 } from 'uuid';
import type { KibanaRequest } from '@kbn/core/server';
import { type TaskManagerStartContract, TaskStatus } from '@kbn/task-manager-plugin/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import type { ResumeWorkflowExecutionParams, WaitForInputTimeoutParams } from './types';
import { generateExecutionTaskScope } from '../utils';

export class WorkflowTaskManager {
  constructor(private taskManager: TaskManagerStartContract) {}

  async scheduleResumeTask({
    workflowExecution,
    resumeAt,
    fakeRequest,
  }: {
    workflowExecution: EsWorkflowExecution;
    resumeAt: Date;
    fakeRequest: KibanaRequest;
  }): Promise<{ taskId: string }> {
    const task = await this.taskManager.schedule(
      {
        id: v4(),
        taskType: 'workflow:resume',
        params: {
          workflowRunId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
        } as ResumeWorkflowExecutionParams,
        state: {},
        runAt: resumeAt,
        scope: generateExecutionTaskScope(workflowExecution as EsWorkflowExecution),
      },
      { request: fakeRequest }
    );

    return {
      taskId: task.id,
    };
  }

  async scheduleWaitForInputTimeoutTask({
    workflowExecution,
    stepExecutionId,
    timeoutAt,
    fakeRequest,
  }: {
    workflowExecution: EsWorkflowExecution;
    stepExecutionId: string;
    timeoutAt: Date;
    fakeRequest: KibanaRequest;
  }): Promise<{ taskId: string }> {
    const taskId = v4();
    const task = await this.taskManager.schedule(
      {
        id: taskId,
        taskType: 'workflow:waitForInput:timeout',
        params: {
          workflowRunId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
          stepExecutionId,
        } as WaitForInputTimeoutParams,
        state: {},
        runAt: timeoutAt,
        scope: generateExecutionTaskScope(workflowExecution as EsWorkflowExecution),
      },
      { request: fakeRequest }
    );

    return {
      taskId: task.id,
    };
  }

  async cancelTask(taskId: string): Promise<void> {
    try {
      await this.taskManager.removeIfExists(taskId);
    } catch (error) {
      // Task may have already been removed or executed, ignore errors
    }
  }

  async forceRunIdleTasks(workflowExecutionId: string): Promise<void> {
    const { docs: idleTasks } = await this.taskManager.fetch({
      query: {
        bool: {
          must: [
            {
              term: {
                'task.status': TaskStatus.Idle,
              },
            },
            {
              term: {
                'task.scope': `workflow:execution:${workflowExecutionId}`,
              },
            },
          ],
        },
      },
    });

    if (idleTasks.length) {
      // TODO: To use bulkRunSoon once available
      await Promise.all(idleTasks.map((idleTask) => this.taskManager.runSoon(idleTask.id)));
    }
  }
}
