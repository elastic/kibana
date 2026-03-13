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

const VERSION_CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;

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
   * Schedules tasks for all scheduled triggers in a workflow.
   * Uses idempotent scheduling: if a task already exists, its schedule is updated in place.
   */
  async scheduleWorkflowTasks(
    workflow: EsWorkflow,
    spaceId: string,
    request: KibanaRequest
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
   * Schedules a single workflow task for a specific trigger.
   * Idempotent: if the task already exists (409 conflict), updates the schedule in place
   * via bulkUpdateSchedules instead of failing. This handles both interval and RRule schedules.
   */
  async scheduleWorkflowTask(
    workflowId: string,
    spaceId: string,
    trigger: WorkflowTrigger,
    request: KibanaRequest
  ): Promise<string> {
    const schedule = convertWorkflowScheduleToTaskSchedule(trigger);
    const taskId = `workflow:${workflowId}:${trigger.type}`;

    // Log RRule-specific scheduling details
    if ('rrule' in schedule && schedule.rrule) {
      const freqText = getReadableFrequency(schedule.rrule.freq);
      const intervalText = getReadableInterval(schedule.rrule.freq, schedule.rrule.interval);

      this.logger.debug(
        `RRule schedule created for workflow ${workflowId}: ${freqText} every ${schedule.rrule.interval} ${intervalText}`
      );
    }

    const taskInstance = {
      id: taskId,
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

    try {
      // Use Task Manager's first-class API key support by passing the request.
      // Task Manager will automatically create and manage the API key for user context.
      const scheduledTask = await this.taskManager.schedule(taskInstance, { request });

      return scheduledTask.id;
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === VERSION_CONFLICT_STATUS) {
        // Task already exists — update its schedule in place rather than failing.
        // This handles both interval and RRule schedule types.
        const result = await this.taskManager.bulkUpdateSchedules([taskId], schedule);
        if (result.errors.length > 0) {
          const firstError = result.errors[0].error;
          // 409 (concurrent update) and 404 (task was just removed) are non-fatal
          if (
            firstError.statusCode !== VERSION_CONFLICT_STATUS &&
            firstError.statusCode !== NOT_FOUND_STATUS
          ) {
            throw new Error(
              `Failed to update schedule for workflow task "${taskId}": ${firstError.message}`
            );
          }
        }
        this.logger.debug(
          `Updated existing scheduled task for workflow ${workflowId} (schedule updated in place)`
        );
        return taskId;
      }
      throw err;
    }
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
   * Updates scheduled tasks when a workflow is updated.
   * Uses idempotent scheduling (create-or-update) instead of a non-atomic delete-then-create
   * pattern. This prevents the task from being permanently lost if the create step fails
   * after the delete step succeeds.
   */
  async updateWorkflowTasks(
    workflow: EsWorkflow,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void> {
    // Schedule tasks idempotently — creates new tasks or updates existing ones in place.
    // No need to unschedule first since scheduleWorkflowTask handles 409 conflicts gracefully.
    await this.scheduleWorkflowTasks(workflow, spaceId, request);
  }
}
