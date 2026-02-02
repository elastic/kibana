/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { type EsWorkflowExecution, ExecutionStatus } from '@kbn/workflows';
import type { ResumeWorkflowExecutionParams } from './types';
import { WorkflowTaskManager } from './workflow_task_manager';
import { generateExecutionTaskScope } from '../utils';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));
jest.mock('../utils', () => ({
  generateExecutionTaskScope: jest.fn(() => [
    'workflow',
    'workflow:test-workflow-id',
    'workflow:execution:test-execution-id',
  ]),
}));

describe('WorkflowTaskManager', () => {
  let mockTaskManager: jest.Mocked<TaskManagerStartContract>;
  let workflowTaskManager: WorkflowTaskManager;
  let fakeRequest: jest.Mocked<KibanaRequest>;

  const createMockWorkflowExecution = (
    overrides?: Partial<EsWorkflowExecution>
  ): EsWorkflowExecution => ({
    id: 'test-execution-id',
    workflowId: 'test-workflow-id',
    spaceId: 'default',
    isTestRun: false,
    status: ExecutionStatus.RUNNING,
    context: {},
    workflowDefinition: {
      name: 'Test Workflow',
      enabled: false,
      version: '1',
      triggers: [],
      steps: [],
    },
    yaml: '',
    scopeStack: [],
    createdAt: new Date().toISOString(),
    error: null,
    createdBy: 'test-user',
    startedAt: new Date().toISOString(),
    finishedAt: '',
    cancelRequested: false,
    duration: 0,
    ...overrides,
  });

  beforeEach(() => {
    mockTaskManager = {
      schedule: jest.fn(),
      fetch: jest.fn(),
      runSoon: jest.fn(),
    } as any;
    fakeRequest = jest.mocked({} as KibanaRequest);

    workflowTaskManager = new WorkflowTaskManager(mockTaskManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduleResumeTask', () => {
    it('should schedule a resume task with correct parameters', async () => {
      const workflowExecution = createMockWorkflowExecution();
      const resumeAt = new Date('2025-11-17T12:00:00.000Z');
      const mockTaskId = 'scheduled-task-id';

      mockTaskManager.schedule.mockResolvedValue({ id: mockTaskId } as any);

      const result = await workflowTaskManager.scheduleResumeTask({
        workflowExecution,
        resumeAt,
        fakeRequest,
      });

      expect(result).toEqual({ taskId: mockTaskId });
      expect(generateExecutionTaskScope).toHaveBeenCalledWith(workflowExecution);
      expect(mockTaskManager.schedule).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.schedule).toHaveBeenCalledWith(
        {
          id: 'mocked-uuid',
          taskType: 'workflow:resume',
          params: {
            workflowRunId: 'test-execution-id',
            spaceId: 'default',
          } as ResumeWorkflowExecutionParams,
          state: {},
          runAt: resumeAt,
          scope: ['workflow', 'workflow:test-workflow-id', 'workflow:execution:test-execution-id'],
        },
        {
          request: fakeRequest,
        }
      );
    });

    it('should include stepId in scope when present', async () => {
      const workflowExecution = createMockWorkflowExecution({
        stepId: 'test-step-id',
      });
      const resumeAt = new Date('2025-11-17T12:00:00.000Z');

      mockTaskManager.schedule.mockResolvedValue({ id: 'task-id' } as any);

      await workflowTaskManager.scheduleResumeTask({
        workflowExecution,
        resumeAt,
        fakeRequest,
      });

      expect(generateExecutionTaskScope).toHaveBeenCalledWith(workflowExecution);
      expect(mockTaskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: ['workflow', 'workflow:test-workflow-id', 'workflow:execution:test-execution-id'],
        }),
        expect.anything()
      );
    });

    it('should handle different space IDs', async () => {
      const workflowExecution = createMockWorkflowExecution({
        spaceId: 'custom-space',
      });
      const resumeAt = new Date('2025-11-17T12:00:00.000Z');

      mockTaskManager.schedule.mockResolvedValue({ id: 'task-id' } as any);

      await workflowTaskManager.scheduleResumeTask({
        workflowExecution,
        resumeAt,
        fakeRequest,
      });

      expect(mockTaskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            spaceId: 'custom-space',
          }),
        }),
        expect.anything()
      );
    });

    it('should propagate errors from task manager', async () => {
      const workflowExecution = createMockWorkflowExecution();
      const resumeAt = new Date('2025-11-17T12:00:00.000Z');
      const mockError = new Error('Task scheduling failed');

      mockTaskManager.schedule.mockRejectedValue(mockError);

      await expect(
        workflowTaskManager.scheduleResumeTask({
          workflowExecution,
          resumeAt,
          fakeRequest,
        })
      ).rejects.toThrow('Task scheduling failed');
    });
  });

  describe('forceRunIdleTasks', () => {
    const workflowExecutionId = 'test-execution-id';

    it('should fetch idle tasks with correct query', async () => {
      mockTaskManager.fetch.mockResolvedValue({ docs: [] } as any);

      await workflowTaskManager.forceRunIdleTasks(workflowExecutionId);

      expect(mockTaskManager.fetch).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.fetch).toHaveBeenCalledWith({
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
    });

    it('should do nothing when no idle tasks are found', async () => {
      mockTaskManager.fetch.mockResolvedValue({ docs: [] } as any);

      await workflowTaskManager.forceRunIdleTasks(workflowExecutionId);

      expect(mockTaskManager.fetch).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.runSoon).not.toHaveBeenCalled();
    });

    it('should remove and reschedule idle tasks when found', async () => {
      const mockIdleTasks = [
        {
          id: 'task-1',
          taskType: 'workflow:resume',
          params: { workflowRunId: 'exec-1', spaceId: 'default' },
          state: {},
          scope: [`workflow:execution:${workflowExecutionId}`],
          runAt: new Date('2025-11-17T12:00:00.000Z'),
        },
        {
          id: 'task-2',
          taskType: 'workflow:resume',
          params: { workflowRunId: 'exec-2', spaceId: 'default' },
          state: {},
          scope: [`workflow:execution:${workflowExecutionId}`],
          runAt: new Date('2025-11-17T13:00:00.000Z'),
        },
      ];

      mockTaskManager.fetch.mockResolvedValue({ docs: mockIdleTasks } as any);

      await workflowTaskManager.forceRunIdleTasks(workflowExecutionId);

      ['task-1', 'task-2'].forEach((taskId) => {
        expect(mockTaskManager.runSoon).toHaveBeenCalledWith(taskId);
      });
      expect(mockTaskManager.runSoon).toHaveBeenCalledTimes(2);
    });

    it('should generate new UUIDs for each rescheduled task', async () => {
      const mockIdleTasks = [
        { id: 'task-1', params: {}, state: {}, scope: [] },
        { id: 'task-2', params: {}, state: {}, scope: [] },
      ];

      mockTaskManager.fetch.mockResolvedValue({ docs: mockIdleTasks } as any);

      await workflowTaskManager.forceRunIdleTasks(workflowExecutionId);

      mockIdleTasks.forEach((task) => {
        expect(mockTaskManager.runSoon).toHaveBeenCalledWith(task.id);
      });
    });
  });
});
