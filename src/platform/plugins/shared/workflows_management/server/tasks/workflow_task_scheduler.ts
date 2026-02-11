/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EsWorkflow } from '@kbn/workflows';
import { getReadableFrequency, getReadableInterval } from '../lib/rrule_logging_utils';
import type { WorkflowTrigger } from '../lib/schedule_utils';
import { convertWorkflowScheduleToTaskSchedule, getScheduledTriggers } from '../lib/schedule_utils';

export interface WorkflowTaskSchedulerParams {
  workflowId: string;
  spaceId: string;
  schedule: { interval: string };
}

export class WorkflowTaskScheduler {
  constructor(
    private readonly logger: Logger,
    private readonly taskManager: TaskManagerStartContract
  ) {}

  /**
   * Schedules tasks for all scheduled triggers in a workflow
   */
  async scheduleWorkflowTasks(
    workflow: EsWorkflow,
    spaceId: string,
    request?: KibanaRequest
  ): Promise<string[]> {
    const scheduledTriggers = getScheduledTriggers(workflow.definition?.triggers ?? []);
    const scheduledTaskIds: string[] = [];

    for (const trigger of scheduledTriggers) {
      try {
        const taskId = await this.scheduleWorkflowTask(workflow.id, spaceId, trigger, request);
        scheduledTaskIds.push(taskId);
        this.logger.debug(
          `Scheduled workflow task for workflow ${workflow.id}, trigger ${trigger.type}, task ID: ${taskId}`
        );
      } catch (error) {
        this.logger.error(
          `Failed to schedule workflow task for workflow ${workflow.id}, trigger ${trigger.type}: ${error}`
        );
        throw error;
      }
    }

    return scheduledTaskIds;
  }

  /**
   * Schedules a single workflow task for a specific trigger
   */
  async scheduleWorkflowTask(
    workflowId: string,
    spaceId: string,
    trigger: WorkflowTrigger,
    request?: KibanaRequest
  ): Promise<string> {
    const schedule = convertWorkflowScheduleToTaskSchedule(trigger);

    // Log RRule-specific scheduling details
    if ('rrule' in schedule && schedule.rrule) {
      const freqText = getReadableFrequency(schedule.rrule.freq);
      const intervalText = getReadableInterval(schedule.rrule.freq, schedule.rrule.interval);

      this.logger.debug(
        `RRule schedule created for workflow ${workflowId}: ${freqText} every ${schedule.rrule.interval} ${intervalText}`
      );
    }

    const taskInstance = {
      id: `workflow:${workflowId}:${trigger.type}`,
      taskType: 'workflow:scheduled',
      schedule,
      params: {
        workflowId,
        spaceId,
        triggerType: trigger.type,
      },
      state: {
        lastRunAt: null,
        lastRunStatus: null,
        lastRunError: null,
      },
      scope: ['workflows'],
      enabled: true,
    };

    // Use Task Manager's first-class API key support by passing the request
    // Task Manager will automatically create and manage the API key for user context
    const scheduledTask = request
      ? await this.taskManager.schedule(taskInstance, { request })
      : await this.taskManager.schedule(taskInstance);

    return scheduledTask.id;
  }

  /**
   * Unschedules all tasks for a workflow
   */

  async unscheduleWorkflowTasks(workflowId: string): Promise<void> {
    try {
      // Find all tasks for this workflow
      const tasks = await this.taskManager.fetch({
        query: {
          bool: {
            must: [
              { term: { 'task.taskType': 'workflow:scheduled' } },
              { ids: { values: [`task:workflow:${workflowId}:scheduled`] } },
            ],
          },
        },
      });

      // Remove all tasks
      const taskIds = tasks.docs.map((task) => task.id);
      if (taskIds.length > 0) {
        await this.taskManager.bulkRemove(taskIds);
        this.logger.debug(`Unscheduled ${taskIds.length} tasks for workflow ${workflowId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to unschedule tasks for workflow ${workflowId}: ${error}`);
      throw error;
    }
  }

  /**
   * Updates scheduled tasks when a workflow is updated
   */
  async updateWorkflowTasks(
    workflow: EsWorkflow,
    spaceId: string,
    request?: KibanaRequest
  ): Promise<void> {
    // First, unschedule all existing tasks
    await this.unscheduleWorkflowTasks(workflow.id);

    // Then, schedule new tasks for scheduled triggers
    await this.scheduleWorkflowTasks(workflow, spaceId, request);
  }
}
