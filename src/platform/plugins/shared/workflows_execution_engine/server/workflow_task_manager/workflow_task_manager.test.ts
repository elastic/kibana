/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../workflow_context_manager/apm_internal', () => {
  const actual = jest.requireActual('../workflow_context_manager/apm_internal');
  return {
    ...actual,
    withTraceParent: jest.fn((_apm, _traceParent, run: () => Promise<unknown>) => run()),
  };
});

import type { KibanaRequest } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { type EsWorkflowExecution, ExecutionStatus } from '@kbn/workflows';
import { WORKFLOW_RESUME_TASK_TYPE } from './types';
import type { ResumeWorkflowExecutionParams } from './types';
import { getWorkflowGlobalTimeoutResumeTaskId, WorkflowTaskManager } from './workflow_task_manager';
import { generateExecutionTaskScope } from '../utils';
import { withTraceParent } from '../workflow_context_manager/apm_internal';

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
      removeIfExists: jest.fn().mockResolvedValue(undefined),
      get: jest
        .fn()
        .mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError('task', 'missing')),
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

  describe('scheduleWorkflowGlobalTimeoutResumeTask', () => {
    it('removes and schedules when no matching task exists (get returns not found)', async () => {
      const workflowExecution = createMockWorkflowExecution();
      const resumeAt = new Date('2025-11-17T12:00:00.000Z');
      const stableId = getWorkflowGlobalTimeoutResumeTaskId(workflowExecution.id);

      mockTaskManager.schedule.mockResolvedValue({ id: stableId } as any);

      const result = await workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask({
        workflowExecution,
        resumeAt,
        fakeRequest,
      });

      expect(result).toEqual({ taskId: stableId });
      expect(mockTaskManager.get).toHaveBeenCalledWith(stableId);
      expect(mockTaskManager.removeIfExists).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.removeIfExists).toHaveBeenCalledWith(stableId);
      expect(mockTaskManager.schedule).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.schedule).toHaveBeenCalledWith(
        {
          id: stableId,
          taskType: WORKFLOW_RESUME_TASK_TYPE,
          params: {
            workflowRunId: 'test-execution-id',
            spaceId: 'default',
          } as ResumeWorkflowExecutionParams,
          state: {},
          runAt: resumeAt,
          scope: ['workflow', 'workflow:test-workflow-id', 'workflow:execution:test-execution-id'],
        },
        { request: fakeRequest }
      );
    });

    it('skips remove and schedule when an equivalent task already exists', async () => {
      const workflowExecution = createMockWorkflowExecution();
      const resumeAt = new Date('2025-11-17T12:00:00.000Z');
      const stableId = getWorkflowGlobalTimeoutResumeTaskId(workflowExecution.id);

      mockTaskManager.get.mockResolvedValue({
        id: stableId,
        taskType: WORKFLOW_RESUME_TASK_TYPE,
        runAt: resumeAt,
        params: {
          workflowRunId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
        },
      } as any);

      const result = await workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask({
        workflowExecution,
        resumeAt,
        fakeRequest,
      });

      expect(result).toEqual({ taskId: stableId });
      expect(mockTaskManager.removeIfExists).not.toHaveBeenCalled();
      expect(mockTaskManager.schedule).not.toHaveBeenCalled();
    });

    it('removes and reschedules when existing task has a different runAt', async () => {
      const workflowExecution = createMockWorkflowExecution();
      const resumeAt = new Date('2025-11-17T12:00:00.000Z');
      const stableId = getWorkflowGlobalTimeoutResumeTaskId(workflowExecution.id);

      mockTaskManager.get.mockResolvedValue({
        id: stableId,
        taskType: WORKFLOW_RESUME_TASK_TYPE,
        runAt: new Date('2020-01-01T00:00:00.000Z'),
        params: {
          workflowRunId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
        },
      } as any);
      mockTaskManager.schedule.mockResolvedValue({ id: stableId } as any);

      await workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask({
        workflowExecution,
        resumeAt,
        fakeRequest,
      });

      expect(mockTaskManager.removeIfExists).toHaveBeenCalledWith(stableId);
      expect(mockTaskManager.schedule).toHaveBeenCalledTimes(1);
    });

    it('propagates non-not-found errors from get', async () => {
      const workflowExecution = createMockWorkflowExecution();
      const resumeAt = new Date('2025-11-17T12:00:00.000Z');
      mockTaskManager.get.mockRejectedValue(new Error('cluster unavailable'));

      await expect(
        workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask({
          workflowExecution,
          resumeAt,
          fakeRequest,
        })
      ).rejects.toThrow('cluster unavailable');
    });
  });

  describe('scheduleImmediateResume', () => {
    it('should schedule a resume task with WORKFLOW_RESUME_TASK_TYPE and no runAt', async () => {
      mockTaskManager.schedule.mockResolvedValue({ id: 'immediate-task-id' } as any);

      const result = await workflowTaskManager.scheduleImmediateResume({
        executionId: 'exec-789',
        spaceId: 'default',
        fakeRequest,
      });

      expect(result).toEqual({ taskId: 'immediate-task-id' });
      expect(mockTaskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: WORKFLOW_RESUME_TASK_TYPE,
          params: {
            workflowRunId: 'exec-789',
            spaceId: 'default',
          } as ResumeWorkflowExecutionParams,
          state: {},
          scope: ['workflow:execution:exec-789'],
        }),
        { request: fakeRequest }
      );
      // runAt must not be set — task runs at the next available slot
      const scheduledTask = (mockTaskManager.schedule as jest.Mock).mock.calls[0][0];
      expect(scheduledTask.runAt).toBeUndefined();
    });

    it('should use executionId-scoped scope string', async () => {
      mockTaskManager.schedule.mockResolvedValue({ id: 'task-id' } as any);

      await workflowTaskManager.scheduleImmediateResume({
        executionId: 'exec-abc',
        spaceId: 'space-x',
        fakeRequest,
      });

      const scheduledTask = (mockTaskManager.schedule as jest.Mock).mock.calls[0][0];
      expect(scheduledTask.scope).toEqual(['workflow:execution:exec-abc']);
      expect(scheduledTask.params.spaceId).toBe('space-x');
    });

    it('should propagate scheduling errors', async () => {
      mockTaskManager.schedule.mockRejectedValue(new Error('Task manager unavailable'));

      await expect(
        workflowTaskManager.scheduleImmediateResume({
          executionId: 'exec-fail',
          spaceId: 'default',
          fakeRequest,
        })
      ).rejects.toThrow('Task manager unavailable');
    });

    it('should schedule without request when fakeRequest is omitted', async () => {
      mockTaskManager.schedule.mockResolvedValue({ id: 'no-req-task' } as any);

      await workflowTaskManager.scheduleImmediateResume({
        executionId: 'exec-no-req',
        spaceId: 'default',
      });

      expect(mockTaskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { workflowRunId: 'exec-no-req', spaceId: 'default' },
        }),
        undefined
      );
    });

    it('should schedule under persisted trace parent context when provided', async () => {
      mockTaskManager.schedule.mockResolvedValue({ id: 'trace-task-id' } as any);

      await workflowTaskManager.scheduleImmediateResume({
        executionId: 'exec-trace',
        spaceId: 'default',
        fakeRequest,
        traceParent: '00-stored-trace-span-01',
      });

      expect(withTraceParent).toHaveBeenCalledWith(
        expect.anything(),
        '00-stored-trace-span-01',
        expect.any(Function),
        { transactionName: 'workflow immediate resume schedule' }
      );
    });
  });

  describe('forceRunIdleTasks', () => {
    const workflowExecutionId = 'test-execution-id';

    it('should fetch idle tasks with correct query', async () => {
      mockTaskManager.fetch.mockResolvedValue({ docs: [] } as any);

      await workflowTaskManager.forceRunIdleTasks(workflowExecutionId);

      expect(mockTaskManager.fetch).toHaveBeenCalledTimes(2);
      expect(mockTaskManager.fetch.mock.calls[0][0]).toEqual({
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

    it('should not schedule when no idle tasks and no spaceId options', async () => {
      mockTaskManager.fetch.mockResolvedValue({ docs: [] } as any);

      await workflowTaskManager.forceRunIdleTasks(workflowExecutionId);

      expect(mockTaskManager.fetch).toHaveBeenCalledTimes(2);
      expect(mockTaskManager.schedule).not.toHaveBeenCalled();
      expect(mockTaskManager.runSoon).not.toHaveBeenCalled();
    });

    it('should not schedule when a running task exists for the execution scope', async () => {
      mockTaskManager.fetch
        .mockResolvedValueOnce({ docs: [] } as any)
        .mockResolvedValueOnce({ docs: [{ id: 'running-1', status: TaskStatus.Running }] } as any);

      await workflowTaskManager.forceRunIdleTasks(workflowExecutionId, {
        spaceId: 'default',
        fakeRequest,
      });

      expect(mockTaskManager.fetch).toHaveBeenCalledTimes(2);
      expect(mockTaskManager.schedule).not.toHaveBeenCalled();
      expect(mockTaskManager.runSoon).not.toHaveBeenCalled();
    });

    it('should schedule immediate resume and runSoon when no idle or active tasks and spaceId is set', async () => {
      mockTaskManager.fetch.mockResolvedValue({ docs: [] } as any);
      mockTaskManager.schedule.mockResolvedValue({ id: 'new-resume-task' } as any);

      await workflowTaskManager.forceRunIdleTasks(workflowExecutionId, {
        spaceId: 'default',
        fakeRequest,
      });

      expect(mockTaskManager.fetch).toHaveBeenCalledTimes(2);
      expect(mockTaskManager.schedule).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.runSoon).toHaveBeenCalledWith('new-resume-task');
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

    it('should not runSoon workflow-global-timeout idle task', async () => {
      const globalTimeoutTaskId = getWorkflowGlobalTimeoutResumeTaskId(workflowExecutionId);
      const mockIdleTasks = [
        {
          id: globalTimeoutTaskId,
          taskType: WORKFLOW_RESUME_TASK_TYPE,
          params: { workflowRunId: workflowExecutionId, spaceId: 'default' },
          state: {},
          scope: [`workflow:execution:${workflowExecutionId}`],
          runAt: new Date('2099-01-01T00:00:00.000Z'),
        },
        {
          id: 'immediate-resume-uuid',
          taskType: WORKFLOW_RESUME_TASK_TYPE,
          params: { workflowRunId: workflowExecutionId, spaceId: 'default' },
          state: {},
          scope: [`workflow:execution:${workflowExecutionId}`],
        },
      ];

      mockTaskManager.fetch.mockResolvedValue({ docs: mockIdleTasks } as any);

      await workflowTaskManager.forceRunIdleTasks(workflowExecutionId);

      expect(mockTaskManager.runSoon).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.runSoon).toHaveBeenCalledWith('immediate-resume-uuid');
      expect(mockTaskManager.runSoon).not.toHaveBeenCalledWith(globalTimeoutTaskId);
    });

    it('should schedule immediate resume when only workflow-global-timeout is idle', async () => {
      const globalTimeoutTaskId = getWorkflowGlobalTimeoutResumeTaskId(workflowExecutionId);
      mockTaskManager.fetch
        .mockResolvedValueOnce({
          docs: [
            {
              id: globalTimeoutTaskId,
              taskType: WORKFLOW_RESUME_TASK_TYPE,
              params: { workflowRunId: workflowExecutionId, spaceId: 'default' },
              state: {},
              scope: [`workflow:execution:${workflowExecutionId}`],
              runAt: new Date('2099-01-01T00:00:00.000Z'),
            },
          ],
        } as any)
        .mockResolvedValueOnce({ docs: [] } as any);
      mockTaskManager.schedule.mockResolvedValue({ id: 'new-resume-task' } as any);

      await workflowTaskManager.forceRunIdleTasks(workflowExecutionId, {
        spaceId: 'default',
        fakeRequest,
      });

      expect(mockTaskManager.runSoon).not.toHaveBeenCalledWith(globalTimeoutTaskId);
      expect(mockTaskManager.schedule).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.runSoon).toHaveBeenCalledWith('new-resume-task');
    });
  });
});
