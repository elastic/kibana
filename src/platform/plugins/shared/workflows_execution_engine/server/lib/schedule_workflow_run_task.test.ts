/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ExecutionStatus } from '@kbn/workflows';
import {
  bulkScheduleRunTasksOrMarkFailed,
  scheduleRunTaskOrMarkFailed,
  type ScheduleWorkflowRunTaskDeps,
  type WorkflowRunTaskInstance,
} from './schedule_workflow_run_task';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

const scheduleError = new Error('api key grant failed');
const request = {} as KibanaRequest;

const createTask = (executionId: string): WorkflowRunTaskInstance => ({
  id: `workflow:${executionId}:alert`,
  taskType: 'workflow:run',
  params: { workflowRunId: executionId, spaceId: 'default' },
  state: {},
});
const tasks = [createTask('exec-a'), createTask('exec-b')];

const failedUpdate = (id: string, message = scheduleError.message) => ({
  id,
  status: ExecutionStatus.FAILED,
  error: { type: 'TaskScheduleError', message },
  finishedAt: expect.any(String),
});

const notFound = (id: string) => ({
  tag: 'err' as const,
  error: { id, type: 'task', error: { statusCode: 404, error: 'Not Found', message: 'Not found' } },
});

describe('schedule_workflow_run_task', () => {
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  let bulkUpdateWorkflowExecutions: jest.Mock;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let deps: ScheduleWorkflowRunTaskDeps;

  beforeEach(() => {
    taskManager = taskManagerMock.createStart();
    taskManager.schedule.mockRejectedValue(scheduleError);
    taskManager.bulkSchedule.mockRejectedValue(scheduleError);
    taskManager.bulkGet.mockImplementation(async (ids) => ids.map(notFound));
    bulkUpdateWorkflowExecutions = jest.fn().mockResolvedValue(undefined);
    logger = loggingSystemMock.createLogger();
    deps = {
      taskManager,
      workflowExecutionRepository: {
        bulkUpdateWorkflowExecutions,
      } as unknown as WorkflowExecutionRepository,
      logger,
    };
  });

  describe('scheduleRunTaskOrMarkFailed', () => {
    it('marks the execution FAILED and rethrows when schedule throws', async () => {
      await expect(scheduleRunTaskOrMarkFailed(deps, tasks[0], request)).rejects.toBe(
        scheduleError
      );

      expect(bulkUpdateWorkflowExecutions).toHaveBeenCalledWith([failedUpdate('exec-a')]);
    });

    it('does not mark the execution when the task is scheduled', async () => {
      taskManager.schedule.mockImplementation(async (task) => task as never);

      await scheduleRunTaskOrMarkFailed(deps, tasks[0], request);

      expect(bulkUpdateWorkflowExecutions).not.toHaveBeenCalled();
    });

    it('logs and still rethrows the schedule error when marking the execution FAILED also fails', async () => {
      bulkUpdateWorkflowExecutions.mockRejectedValue(new Error('es unavailable'));

      await expect(scheduleRunTaskOrMarkFailed(deps, tasks[0], request)).rejects.toBe(
        scheduleError
      );

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('exec-a'));
    });
  });

  describe('bulkScheduleRunTasksOrMarkFailed', () => {
    it('marks every execution FAILED when bulkSchedule throws and no task was saved', async () => {
      const result = await bulkScheduleRunTasksOrMarkFailed(deps, tasks, request);

      expect(bulkUpdateWorkflowExecutions).toHaveBeenCalledWith([
        failedUpdate('exec-a'),
        failedUpdate('exec-b'),
      ]);
      expect(result).toEqual({
        failedExecutionIds: new Set(['exec-a', 'exec-b']),
        message: scheduleError.message,
      });
    });

    it('marks only the executions whose task was not saved when bulkSchedule throws', async () => {
      taskManager.bulkGet.mockImplementation(async ([savedId, missingId]) => [
        { tag: 'ok', value: { id: savedId } as never },
        notFound(missingId),
      ]);

      const result = await bulkScheduleRunTasksOrMarkFailed(deps, tasks, request);

      expect(bulkUpdateWorkflowExecutions).toHaveBeenCalledWith([failedUpdate('exec-b')]);
      expect(result.failedExecutionIds).toEqual(new Set(['exec-b']));
    });

    it('uses the message of a plain-object error that Task Manager throws for one item', async () => {
      taskManager.bulkSchedule.mockRejectedValue({ statusCode: 409, message: 'version conflict' });

      const result = await bulkScheduleRunTasksOrMarkFailed(deps, tasks, request);

      expect(bulkUpdateWorkflowExecutions).toHaveBeenCalledWith([
        failedUpdate('exec-a', 'version conflict'),
        failedUpdate('exec-b', 'version conflict'),
      ]);
      expect(result.message).toBe('version conflict');
    });

    it('marks every execution FAILED when the task lookup also fails', async () => {
      taskManager.bulkGet.mockRejectedValue(new Error('es unavailable'));

      await bulkScheduleRunTasksOrMarkFailed(deps, tasks, request);

      expect(bulkUpdateWorkflowExecutions).toHaveBeenCalledWith([
        failedUpdate('exec-a'),
        failedUpdate('exec-b'),
      ]);
    });

    it('marks an execution FAILED when bulkSchedule skips its task without throwing', async () => {
      taskManager.bulkSchedule.mockImplementation(async ([scheduledTask]) => [
        scheduledTask as never,
      ]);

      const result = await bulkScheduleRunTasksOrMarkFailed(deps, tasks, request);

      const message = 'Task Manager did not schedule the workflow task.';
      expect(bulkUpdateWorkflowExecutions).toHaveBeenCalledWith([failedUpdate('exec-b', message)]);
      expect(result).toEqual({ failedExecutionIds: new Set(['exec-b']), message });
    });

    it('does not mark any execution when every task is scheduled', async () => {
      taskManager.bulkSchedule.mockImplementation(async (scheduled) => scheduled as never);

      const result = await bulkScheduleRunTasksOrMarkFailed(deps, tasks, request);

      expect(bulkUpdateWorkflowExecutions).not.toHaveBeenCalled();
      expect(result.failedExecutionIds.size).toBe(0);
    });
  });
});
