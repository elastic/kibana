/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { TaskAlreadyRunningError, TaskPriority, TaskStatus } from '@kbn/task-manager-plugin/server';
import { type EsWorkflowExecution, ExecutionStatus } from '@kbn/workflows';
import { WORKFLOW_RESUME_TASK_TYPE } from './types';
import type { ResumeWorkflowExecutionParams } from './types';
import {
  getTaskPriority,
  getWorkflowGlobalTimeoutResumeTaskId,
  getWorkflowImmediateResumeTaskId,
  getWorkflowWakeTaskId,
  WorkflowTaskManager,
} from './workflow_task_manager';
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

describe('getTaskPriority', () => {
  it('returns UserInteractive when context.isUserInteractive is true', () => {
    expect(getTaskPriority({ isUserInteractive: true })).toBe(TaskPriority.UserInteractive);
  });

  it('returns Standard unless the flag is an explicit true', () => {
    expect(getTaskPriority({ isUserInteractive: false })).toBe(TaskPriority.Standard);
    expect(getTaskPriority({ isUserInteractive: 'true' })).toBe(TaskPriority.Standard);
    expect(getTaskPriority({})).toBe(TaskPriority.Standard);
    expect(getTaskPriority(undefined)).toBe(TaskPriority.Standard);
    expect(getTaskPriority(null)).toBe(TaskPriority.Standard);
  });
});

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
      ensureScheduled: jest.fn(),
      fetch: jest.fn(),
      runSoon: jest.fn().mockResolvedValue({ id: 'resume-task', forced: false }),
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
          timeoutOverride: '1m',
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
          cloneApiKey: true,
        }
      );
      expect(mockTaskManager.schedule.mock.calls[0][0].priority).toBeUndefined();
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
          timeoutOverride: '1m',
          params: {
            workflowRunId: 'test-execution-id',
            spaceId: 'default',
          } as ResumeWorkflowExecutionParams,
          state: {},
          runAt: resumeAt,
          scope: ['workflow', 'workflow:test-workflow-id', 'workflow:execution:test-execution-id'],
        },
        { request: fakeRequest, cloneApiKey: true }
      );
      expect(mockTaskManager.schedule.mock.calls[0][0].priority).toBeUndefined();
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

    it('preserves a claimed notification and schedules the next deadline separately', async () => {
      const workflowExecution = createMockWorkflowExecution();
      const resumeAt = new Date('2025-11-17T12:00:00.000Z');
      const stableId = getWorkflowGlobalTimeoutResumeTaskId(workflowExecution.id);

      mockTaskManager.get.mockResolvedValue({
        id: stableId,
        taskType: WORKFLOW_RESUME_TASK_TYPE,
        status: TaskStatus.Running,
        runAt: new Date('2020-01-01T00:00:00.000Z'),
        params: {
          workflowRunId: workflowExecution.id,
          spaceId: workflowExecution.spaceId,
        },
      } as any);

      mockTaskManager.schedule.mockResolvedValue({ id: 'next-deadline' } as never);
      const result = await workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask({
        workflowExecution,
        resumeAt,
        fakeRequest,
      });

      expect(result).toEqual({ taskId: 'next-deadline' });
      expect(mockTaskManager.removeIfExists).not.toHaveBeenCalled();
      expect(mockTaskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({ runAt: resumeAt }),
        { request: fakeRequest, cloneApiKey: true }
      );
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
    it('preserves the stable immediate-resume claim when ensuring the task', async () => {
      const executionId = 'exec-789';
      const stableId = getWorkflowImmediateResumeTaskId(executionId);
      mockTaskManager.ensureScheduled.mockResolvedValue({ id: stableId } as any);

      const result = await workflowTaskManager.scheduleImmediateResume({
        executionId,
        spaceId: 'default',
        fakeRequest,
      });

      expect(result).toEqual({ taskId: stableId });
      expect(mockTaskManager.removeIfExists).not.toHaveBeenCalled();
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        {
          id: stableId,
          taskType: WORKFLOW_RESUME_TASK_TYPE,
          params: {
            workflowRunId: executionId,
            spaceId: 'default',
          } as ResumeWorkflowExecutionParams,
          state: {},
          scope: [`workflow:execution:${executionId}`],
          priority: TaskPriority.Standard,
        },
        { request: fakeRequest, cloneApiKey: true }
      );
      // runAt must not be set — task runs at the next available slot
      const scheduledTask = (mockTaskManager.ensureScheduled as jest.Mock).mock.calls[0][0];
      expect(scheduledTask.runAt).toBeUndefined();
      expect(scheduledTask.priority).toBe(TaskPriority.Standard);
    });

    it('sets UserInteractive priority when isUserInteractive is true', async () => {
      const executionId = 'exec-hitl';
      const stableId = getWorkflowImmediateResumeTaskId(executionId);
      mockTaskManager.ensureScheduled.mockResolvedValue({ id: stableId } as any);

      await workflowTaskManager.scheduleImmediateResume({
        executionId,
        spaceId: 'default',
        fakeRequest,
        isUserInteractive: true,
      });

      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          id: stableId,
          taskType: WORKFLOW_RESUME_TASK_TYPE,
          priority: TaskPriority.UserInteractive,
        }),
        { request: fakeRequest, cloneApiKey: true }
      );
    });

    it('does not remove an existing claim before scheduling', async () => {
      const executionId = 'exec-order-check';
      const stableId = getWorkflowImmediateResumeTaskId(executionId);
      const callOrder: string[] = [];

      mockTaskManager.removeIfExists.mockImplementation(async () => {
        callOrder.push('removeIfExists');
      });
      mockTaskManager.ensureScheduled.mockImplementation(async () => {
        callOrder.push('schedule');
        return { id: stableId } as any;
      });

      await workflowTaskManager.scheduleImmediateResume({
        executionId,
        spaceId: 'default',
        fakeRequest,
      });

      expect(callOrder).toEqual(['schedule']);
    });

    it('uses executionId-scoped scope string and correct spaceId', async () => {
      const executionId = 'exec-abc';
      const stableId = getWorkflowImmediateResumeTaskId(executionId);
      mockTaskManager.ensureScheduled.mockResolvedValue({ id: stableId } as any);

      await workflowTaskManager.scheduleImmediateResume({
        executionId,
        spaceId: 'space-x',
        fakeRequest,
      });

      const scheduledTask = (mockTaskManager.ensureScheduled as jest.Mock).mock.calls[0][0];
      expect(scheduledTask.scope).toEqual([`workflow:execution:${executionId}`]);
      expect(scheduledTask.params.spaceId).toBe('space-x');
    });

    it('propagates scheduling errors', async () => {
      mockTaskManager.ensureScheduled.mockRejectedValue(new Error('Task manager unavailable'));

      await expect(
        workflowTaskManager.scheduleImmediateResume({
          executionId: 'exec-fail',
          spaceId: 'default',
          fakeRequest,
        })
      ).rejects.toThrow('Task manager unavailable');
    });

    it('schedules without request when fakeRequest is omitted', async () => {
      const executionId = 'exec-no-req';
      const stableId = getWorkflowImmediateResumeTaskId(executionId);
      mockTaskManager.ensureScheduled.mockResolvedValue({ id: stableId } as any);

      await workflowTaskManager.scheduleImmediateResume({
        executionId,
        spaceId: 'default',
      });

      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { workflowRunId: executionId, spaceId: 'default' },
        }),
        undefined
      );
    });

    it('concurrent callers ensure the same task without replacing its claim', async () => {
      const executionId = 'exec-concurrent';
      const stableId = getWorkflowImmediateResumeTaskId(executionId);

      mockTaskManager.ensureScheduled.mockResolvedValue({ id: stableId } as any);

      await Promise.all([
        workflowTaskManager.scheduleImmediateResume({
          executionId,
          spaceId: 'default',
          fakeRequest,
        }),
        workflowTaskManager.scheduleImmediateResume({
          executionId,
          spaceId: 'default',
          fakeRequest,
        }),
      ]);

      const scheduledIds = (mockTaskManager.ensureScheduled as jest.Mock).mock.calls.map(
        ([taskDef]) => taskDef.id
      );
      // Both calls must target the same stable id — never a random uuid
      expect(scheduledIds).toEqual([stableId, stableId]);
    });
  });

  describe('scheduleAndRunImmediateResume', () => {
    it('should call scheduleImmediateResume and then runSoon on the returned taskId', async () => {
      const executionId = 'exec-and-run';
      const stableId = getWorkflowImmediateResumeTaskId(executionId);
      mockTaskManager.ensureScheduled.mockResolvedValue({ id: stableId } as any);

      await workflowTaskManager.scheduleAndRunImmediateResume({
        executionId,
        spaceId: 'default',
        fakeRequest,
      });

      expect(mockTaskManager.removeIfExists).not.toHaveBeenCalled();
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.ensureScheduled.mock.calls[0][0].priority).toBe(TaskPriority.Standard);
      expect(mockTaskManager.runSoon).toHaveBeenCalledWith(stableId);
    });

    it('forwards UserInteractive priority onto the immediate resume task', async () => {
      const executionId = 'exec-and-run-ui';
      const stableId = getWorkflowImmediateResumeTaskId(executionId);
      mockTaskManager.ensureScheduled.mockResolvedValue({ id: stableId } as any);

      await workflowTaskManager.scheduleAndRunImmediateResume({
        executionId,
        spaceId: 'default',
        fakeRequest,
        isUserInteractive: true,
      });

      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          id: stableId,
          priority: TaskPriority.UserInteractive,
        }),
        { request: fakeRequest, cloneApiKey: true }
      );
      expect(mockTaskManager.runSoon).toHaveBeenCalledWith(stableId);
    });

    it('should propagate errors from scheduleImmediateResume', async () => {
      mockTaskManager.ensureScheduled.mockRejectedValue(new Error('TM unavailable'));

      await expect(
        workflowTaskManager.scheduleAndRunImmediateResume({
          executionId: 'exec-fail',
          spaceId: 'default',
          fakeRequest,
        })
      ).rejects.toThrow('TM unavailable');

      expect(mockTaskManager.runSoon).not.toHaveBeenCalled();
    });

    it('should propagate errors from runSoon', async () => {
      const executionId = 'exec-runsoon-fail';
      const stableId = getWorkflowImmediateResumeTaskId(executionId);
      mockTaskManager.ensureScheduled.mockResolvedValue({ id: stableId } as any);
      mockTaskManager.runSoon.mockRejectedValue(new Error('runSoon failed'));

      await expect(
        workflowTaskManager.scheduleAndRunImmediateResume({
          executionId,
          spaceId: 'default',
          fakeRequest,
        })
      ).rejects.toThrow('runSoon failed');
    });
  });

  describe('busy resume wake-ups', () => {
    const params = { executionId: 'exec-busy', spaceId: 'default' };

    it.each([
      new TaskAlreadyRunningError('runner'),
      SavedObjectsErrorHelpers.createGenericNotFoundError('task', 'runner'),
    ])('persists a request when runSoon cannot consume the wake-up: %s', async (error) => {
      mockTaskManager.runSoon.mockRejectedValueOnce(error);
      await workflowTaskManager.scheduleAndRunImmediateResume({ ...params, fakeRequest });
      expect(mockTaskManager.removeIfExists).not.toHaveBeenCalled();
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { workflowRunId: params.executionId, spaceId: 'default' },
          runAt: expect.any(Date),
        }),
        { request: fakeRequest, cloneApiKey: true }
      );
    });

    it('retains a notification when runSoon loses an optimistic-concurrency race', async () => {
      mockTaskManager.runSoon.mockResolvedValueOnce({
        id: 'runner',
        forced: false,
        conflict: true,
      });
      await workflowTaskManager.scheduleAndRunImmediateResume(params);
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({ id: getWorkflowWakeTaskId(params.executionId) }),
        undefined
      );
    });

    it('allows the persisted request to wake the runner after its previous claim finishes', async () => {
      mockTaskManager.runSoon.mockRejectedValueOnce(new TaskAlreadyRunningError('runner'));
      expect(await workflowTaskManager.tryRunImmediateResume(params)).toBe(false);
      mockTaskManager.runSoon.mockResolvedValue({ id: 'runner', forced: false });
      expect(await workflowTaskManager.tryRunImmediateResume(params)).toBe(true);
      expect(mockTaskManager.removeIfExists).not.toHaveBeenCalled();
    });
  });

  it('coalesces concurrent busy callbacks into one retained wake task', async () => {
    const ids = new Set<string>();
    mockTaskManager.ensureScheduled.mockImplementation(async (task) => {
      ids.add(task.id);
      return task;
    });
    mockTaskManager.runSoon.mockRejectedValue(new TaskAlreadyRunningError('claimed'));
    await Promise.all(
      Array.from({ length: 20 }, () =>
        workflowTaskManager.scheduleAndRunImmediateResume({
          executionId: 'parent',
          spaceId: 'default',
          fakeRequest,
        })
      )
    );
    expect(ids).toEqual(
      new Set([getWorkflowImmediateResumeTaskId('parent'), getWorkflowWakeTaskId('parent')])
    );
    expect(mockTaskManager.schedule).not.toHaveBeenCalled();
    expect(mockTaskManager.removeIfExists).not.toHaveBeenCalled();
  });

  describe('external resumes after timer hand-off', () => {
    it('accepts an approval during an older timer claim that will install the retained wake', async () => {
      mockTaskManager.runSoon
        .mockRejectedValueOnce(SavedObjectsErrorHelpers.createGenericNotFoundError('task', 'wake'))
        .mockRejectedValueOnce(new TaskAlreadyRunningError('global'));
      await expect(workflowTaskManager.runExistingResumeTask('exec')).resolves.toBeUndefined();
      expect(mockTaskManager.runSoon).toHaveBeenLastCalledWith(
        getWorkflowGlobalTimeoutResumeTaskId('exec')
      );
    });

    it('retains workflow credentials on a stable wake task before installing the HITL timer', async () => {
      mockTaskManager.schedule.mockResolvedValue({ id: 'global' } as never);
      await workflowTaskManager.scheduleWorkflowGlobalTimeoutResumeTask({
        workflowExecution: createMockWorkflowExecution(),
        resumeAt: new Date(Date.now() + 60_000),
        fakeRequest,
      });
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({ id: getWorkflowWakeTaskId('test-execution-id') }),
        { request: fakeRequest, cloneApiKey: true }
      );
      expect(mockTaskManager.ensureScheduled.mock.invocationCallOrder[0]).toBeLessThan(
        mockTaskManager.schedule.mock.invocationCallOrder[0]
      );
    });

    it('wakes approval through the retained task even when the global timer is claimed', async () => {
      mockTaskManager.runSoon.mockImplementation(async (taskId) => {
        if (taskId === getWorkflowGlobalTimeoutResumeTaskId('exec')) {
          throw new TaskAlreadyRunningError(taskId);
        }
        return { id: taskId, forced: false };
      });
      await workflowTaskManager.runExistingResumeTask('exec');
      expect(mockTaskManager.runSoon).toHaveBeenCalledWith(getWorkflowWakeTaskId('exec'));
      expect(mockTaskManager.schedule).not.toHaveBeenCalled();
    });

    it.each([false, true])(
      'retries a conflicting external wake-up (fallback=%s)',
      async (fallback) => {
        if (fallback) {
          mockTaskManager.runSoon.mockRejectedValueOnce(
            SavedObjectsErrorHelpers.createGenericNotFoundError('task', 'global')
          );
          mockTaskManager.runSoon.mockRejectedValueOnce(
            SavedObjectsErrorHelpers.createGenericNotFoundError('task', 'wake')
          );
          mockTaskManager.fetch.mockResolvedValue({ docs: [{ id: 'next-deadline' }] } as never);
        }
        mockTaskManager.runSoon.mockResolvedValueOnce({
          id: 'resume-task',
          forced: false,
          conflict: true,
        });
        await workflowTaskManager.runExistingResumeTask('exec');
        expect(mockTaskManager.runSoon).toHaveBeenCalledTimes(fallback ? 4 : 2);
        expect(mockTaskManager.runSoon).toHaveBeenLastCalledWith(
          fallback ? 'next-deadline' : getWorkflowWakeTaskId('exec')
        );
      }
    );

    it('reports failure when every external wake-up update conflicts', async () => {
      mockTaskManager.runSoon.mockResolvedValue({
        id: 'resume-task',
        forced: false,
        conflict: true,
      });
      await expect(workflowTaskManager.runExistingResumeTask('exec')).rejects.toMatchObject({
        output: { statusCode: 409 },
      });
      expect(mockTaskManager.runSoon).toHaveBeenCalledTimes(3);
    });

    it('accepts an approval while the retained authenticated wake task is claimed', async () => {
      mockTaskManager.runSoon.mockRejectedValue(new TaskAlreadyRunningError('active'));
      await expect(workflowTaskManager.runExistingResumeTask('exec')).resolves.toBeUndefined();
      expect(mockTaskManager.runSoon).toHaveBeenCalledWith(getWorkflowWakeTaskId('exec'));
      expect(mockTaskManager.removeIfExists).not.toHaveBeenCalled();
      expect(mockTaskManager.schedule).not.toHaveBeenCalled();
    });

    it('wakes the remaining authenticated timer when the global notification has completed', async () => {
      mockTaskManager.runSoon.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError('task', 'wake')
      );
      mockTaskManager.runSoon.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError('task', 'global')
      );
      mockTaskManager.fetch.mockResolvedValue({ docs: [{ id: 'next-deadline' }] } as never);
      await workflowTaskManager.runExistingResumeTask('exec');
      expect(mockTaskManager.runSoon).toHaveBeenLastCalledWith('next-deadline');
      expect(mockTaskManager.schedule).not.toHaveBeenCalled();
    });

    it('does not report a successful wake-up when no authenticated task remains', async () => {
      const error = SavedObjectsErrorHelpers.createGenericNotFoundError('task', 'global');
      mockTaskManager.runSoon.mockRejectedValueOnce(error).mockRejectedValueOnce(error);
      mockTaskManager.fetch.mockResolvedValue({ docs: [] } as never);
      await expect(workflowTaskManager.runExistingResumeTask('exec')).rejects.toThrow(error);
    });
  });

  describe('hasActiveTaskForExecution', () => {
    const workflowExecutionId = 'test-execution-id';

    it('should return true when an idle, claiming, or running task exists for the execution scope', async () => {
      mockTaskManager.fetch.mockResolvedValue({ docs: [{ id: 't1' }] } as any);

      const hasActive = await workflowTaskManager.hasActiveTaskForExecution(workflowExecutionId);

      expect(hasActive).toBe(true);
      expect(mockTaskManager.fetch).toHaveBeenCalledWith({
        size: 1,
        query: {
          bool: {
            filter: [
              {
                terms: {
                  'task.status': [TaskStatus.Idle, TaskStatus.Claiming, TaskStatus.Running],
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

    it('should return false when no matching tasks are found', async () => {
      mockTaskManager.fetch.mockResolvedValue({ docs: [] } as any);

      const hasActive = await workflowTaskManager.hasActiveTaskForExecution(workflowExecutionId);

      expect(hasActive).toBe(false);
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
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.runSoon).toHaveBeenCalledWith(
        getWorkflowImmediateResumeTaskId('test-execution-id')
      );
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
      expect(mockTaskManager.ensureScheduled).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.runSoon).toHaveBeenCalledWith(
        getWorkflowImmediateResumeTaskId('test-execution-id')
      );
    });
  });

  describe('queued workflow run tasks', () => {
    it('scheduleDormantQueuedRunTask schedules workflow:run with queue TTL runAt and trigger request', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-08-05T20:00:00.000Z'));
      const workflowExecution = createMockWorkflowExecution({
        triggeredBy: 'alert',
      });
      mockTaskManager.schedule.mockResolvedValue({ id: 'workflow:exec-id:alert' } as any);

      await workflowTaskManager.scheduleDormantQueuedRunTask({
        workflowExecution,
        request: fakeRequest,
      });

      expect(mockTaskManager.removeIfExists).toHaveBeenCalledWith(
        'workflow:test-execution-id:alert'
      );
      expect(mockTaskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'workflow:test-execution-id:alert',
          taskType: 'workflow:run',
          runAt: new Date('2025-08-06T20:00:00.000Z'),
        }),
        { request: fakeRequest, cloneApiKey: true }
      );
      expect(mockTaskManager.schedule.mock.calls[0][0].priority).toBe(TaskPriority.Standard);
      jest.useRealTimers();
    });

    it('scheduleDormantQueuedRunTask uses UserInteractive priority when context flag is set', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-08-05T20:00:00.000Z'));
      const workflowExecution = createMockWorkflowExecution({
        triggeredBy: 'manual',
        context: { isUserInteractive: true },
      });
      mockTaskManager.schedule.mockResolvedValue({
        id: 'workflow:test-execution-id:manual',
      } as any);

      await workflowTaskManager.scheduleDormantQueuedRunTask({
        workflowExecution,
        request: fakeRequest,
      });

      expect(mockTaskManager.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'workflow:test-execution-id:manual',
          taskType: 'workflow:run',
          priority: TaskPriority.UserInteractive,
        }),
        { request: fakeRequest, cloneApiKey: true }
      );
      jest.useRealTimers();
    });

    it('promoteQueuedRunTask calls runSoon on the dormant task id', async () => {
      await workflowTaskManager.promoteQueuedRunTask({
        executionId: 'exec-1',
        triggeredBy: 'manual',
      });

      expect(mockTaskManager.runSoon).toHaveBeenCalledWith('workflow:exec-1:manual');
    });

    it('removeQueuedRunTask removes the dormant task id', async () => {
      await workflowTaskManager.removeQueuedRunTask({
        executionId: 'exec-1',
        triggeredBy: 'manual',
      });

      expect(mockTaskManager.removeIfExists).toHaveBeenCalledWith('workflow:exec-1:manual');
    });
  });
});
