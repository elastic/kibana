/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import { Frequency } from '@kbn/rrule';
import type {
  ConcreteTaskInstance,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { EsWorkflow } from '@kbn/workflows';
import { WorkflowTaskScheduler } from './workflow_task_scheduler';

type FetchReturn = Awaited<ReturnType<TaskManagerStartContract['fetch']>>;

const makeTaskInstance = (
  id: string,
  overrides: Partial<ConcreteTaskInstance> = {}
): ConcreteTaskInstance =>
  ({
    id,
    scheduledAt: new Date('2030-01-01T00:00:00.000Z'),
    ...overrides,
  } as unknown as ConcreteTaskInstance);

const makeFetchResult = (ids: string[]): FetchReturn =>
  ({ docs: ids.map((id) => ({ id })), versionMap: new Map() } as unknown as FetchReturn);

const makeBulkError = (id: string, statusCode: number, message: string) => ({
  id,
  type: 'task',
  error: { statusCode, message } as unknown as SavedObjectError,
});

const makeBulkRemoveStatus = (
  workflowId: string,
  success: boolean,
  statusCode?: number,
  message?: string
) => ({
  id: `workflow:${workflowId}:scheduled`,
  type: 'task',
  success,
  ...(success || statusCode === undefined
    ? {}
    : { error: { statusCode, message: message ?? '' } as unknown as SavedObjectError }),
});

const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  trace: jest.fn(),
  isLevelEnabled: jest.fn(),
  get: jest.fn(),
} as any;

const makeMockTaskManager = (
  overrides?: Partial<TaskManagerStartContract>
): jest.Mocked<TaskManagerStartContract> =>
  ({
    schedule: jest.fn().mockResolvedValue(makeTaskInstance('test-task-id')),
    get: jest.fn().mockResolvedValue(makeTaskInstance('test-task-id')),
    fetch: jest.fn().mockResolvedValue(makeFetchResult([])),
    bulkRemove: jest.fn().mockResolvedValue({ statuses: [] }),
    removeIfExists: jest.fn().mockResolvedValue(undefined),
    bulkUpdateSchedules: jest.fn().mockResolvedValue({ tasks: [], errors: [] }),
    ...overrides,
  } as any);

const mockRequest = {} as KibanaRequest;

const makeWorkflow = (overrides?: Partial<EsWorkflow>): EsWorkflow => ({
  id: 'test-workflow',
  name: 'Test Workflow',
  enabled: true,
  tags: [],
  definition: {
    triggers: [{ type: 'scheduled', with: { every: '30s' } }],
    steps: [],
    name: 'Test Workflow',
    enabled: false,
    version: '1',
  },
  yaml: '',
  createdBy: 'test-user',
  lastUpdatedBy: 'test-user',
  valid: true,
  deleted_at: null,
  createdAt: new Date(),
  lastUpdatedAt: new Date(),
  ...overrides,
});

describe('WorkflowTaskScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduleWorkflowTasks', () => {
    it('schedules a task for each scheduled trigger and returns task IDs', async () => {
      const mockTm = makeMockTaskManager();
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      const result = await scheduler.scheduleWorkflowTasks(makeWorkflow(), 'default', mockRequest);

      expect(result).toEqual(['test-task-id']);
      expect(mockTm.schedule).toHaveBeenCalledTimes(1);
      expect(mockTm.schedule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'workflow:test-workflow:scheduled',
          taskType: 'workflow:scheduled',
          params: { workflowId: 'test-workflow', spaceId: 'default', triggerType: 'scheduled' },
        }),
        { request: mockRequest }
      );
    });

    it.each([undefined, 'old-account', 'account-a'])(
      'schedules a pinned SA task and migrates previous identity %s',
      async (oldAccount) => {
        const mockTm = makeMockTaskManager();
        const workflow = makeWorkflow();
        if (!workflow.definition) throw new Error('Expected workflow definition');
        workflow.definition.settings = { run_as: 'account-a' };
        mockTm.schedule.mockRejectedValueOnce({ statusCode: 409 });
        mockTm.get.mockResolvedValue(
          makeTaskInstance('workflow:test-workflow:scheduled', {
            credential: oldAccount
              ? {
                  type: 'service_account',
                  workloadType: 'workflow',
                  workloadId: workflow.id,
                  spaceId: 'default',
                  expectedServiceAccountId: oldAccount,
                }
              : undefined,
          })
        );
        mockTm.bulkUpdateSchedules.mockResolvedValueOnce({
          tasks: [makeTaskInstance('workflow:test-workflow:scheduled')],
          errors: [],
        });
        const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);
        await scheduler.scheduleWorkflowTasks(workflow, 'default', mockRequest);
        expect(mockTm.schedule).toHaveBeenCalledWith(
          expect.objectContaining({
            runAs: {
              workloadType: 'workflow',
              workloadId: workflow.id,
              spaceId: 'default',
              expectedServiceAccountId: 'account-a',
            },
          }),
          { request: mockRequest }
        );
        if (oldAccount === 'account-a') {
          expect(mockTm.removeIfExists).not.toHaveBeenCalled();
          expect(mockTm.bulkUpdateSchedules).toHaveBeenCalled();
        } else {
          expect(mockTm.removeIfExists).toHaveBeenCalledWith('workflow:test-workflow:scheduled');
          expect(mockTm.schedule).toHaveBeenCalledTimes(2);
        }
      }
    );

    it('replaces SA credentials when a workflow returns to caller execution', async () => {
      const mockTm = makeMockTaskManager();
      mockTm.schedule.mockRejectedValueOnce({ statusCode: 409 });
      mockTm.get.mockResolvedValue(
        makeTaskInstance('workflow:test-workflow:scheduled', {
          credential: {
            type: 'service_account',
            workloadType: 'workflow',
            workloadId: 'test-workflow',
            spaceId: 'default',
            expectedServiceAccountId: 'old-account',
          },
        })
      );
      await new WorkflowTaskScheduler(mockLogger, mockTm).scheduleWorkflowTasks(
        makeWorkflow(),
        'default',
        mockRequest
      );
      expect(mockTm.removeIfExists).toHaveBeenCalledWith('workflow:test-workflow:scheduled');
      expect(mockTm.schedule.mock.calls[1][0].runAs).toBeUndefined();
    });

    it.each(['identity change', 'running task'] as const)(
      'preserves a future RRule dtstart when recreating for %s',
      async (reason) => {
        jest.useFakeTimers().setSystemTime(new Date('2030-01-02T00:00:00.000Z'));
        try {
          const mockTm = makeMockTaskManager();
          const id = 'workflow:test-workflow:scheduled';
          mockTm.schedule.mockRejectedValueOnce({ statusCode: 409 });
          mockTm.get.mockResolvedValue(
            makeTaskInstance(id, {
              schedule: { interval: '30s' },
              runAt: new Date('2030-01-02T00:00:30.000Z'),
            })
          );
          await new WorkflowTaskScheduler(mockLogger, mockTm).scheduleWorkflowTask(
            'test-workflow',
            'default',
            {
              type: 'scheduled',
              with: {
                rrule: {
                  freq: 'DAILY',
                  interval: 1,
                  tzid: 'UTC',
                  dtstart: '2030-02-01T09:00:00.000Z',
                  byhour: [9],
                  byminute: [0],
                },
              },
            },
            mockRequest,
            reason === 'identity change' ? 'account-a' : undefined
          );
          expect(mockTm.schedule.mock.calls[1][0]).toEqual(
            expect.objectContaining({
              scheduledAt: new Date('2030-01-01T00:00:00.000Z'),
              runAt: new Date('2030-02-01T09:00:00.000Z'),
            })
          );
        } finally {
          jest.useRealTimers();
        }
      }
    );

    it('calculates the next occurrence when replacing a running unchanged RRule task', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2030-01-02T12:00:00.000Z'));
      try {
        const mockTm = makeMockTaskManager();
        mockTm.schedule.mockRejectedValueOnce({ statusCode: 409 });
        mockTm.get.mockResolvedValue(
          makeTaskInstance('workflow:test-workflow:scheduled', {
            schedule: {
              rrule: {
                freq: Frequency.DAILY,
                interval: 1,
                tzid: 'UTC',
                byhour: [9],
                byminute: [0],
              },
            },
            runAt: new Date('2030-01-02T09:00:00.000Z'),
          })
        );
        await new WorkflowTaskScheduler(mockLogger, mockTm).scheduleWorkflowTask(
          'test-workflow',
          'default',
          {
            type: 'scheduled',
            with: {
              rrule: {
                freq: 'DAILY',
                interval: 1,
                tzid: 'UTC',
                byhour: [9],
                byminute: [0],
              },
            },
          },
          mockRequest,
          undefined
        );
        expect(mockTm.schedule.mock.calls[1][0].runAt).toEqual(
          new Date('2030-01-03T09:00:00.000Z')
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('returns empty array when workflow has no scheduled triggers', async () => {
      const mockTm = makeMockTaskManager();
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      const result = await scheduler.scheduleWorkflowTasks(
        makeWorkflow({
          definition: {
            triggers: [{ type: 'manual' }],
            steps: [],
            name: 'Manual',
            enabled: true,
            version: '1',
          },
        }),
        'default',
        mockRequest
      );

      expect(result).toEqual([]);
      expect(mockTm.schedule).not.toHaveBeenCalled();
    });

    it('returns empty array when definition has no triggers', async () => {
      const mockTm = makeMockTaskManager();
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      const result = await scheduler.scheduleWorkflowTasks(
        makeWorkflow({ definition: undefined }),
        'default',
        mockRequest
      );

      expect(result).toEqual([]);
      expect(mockTm.schedule).not.toHaveBeenCalled();
    });

    it('schedules multiple triggers and returns all task IDs', async () => {
      const mockTm = makeMockTaskManager();
      let callCount = 0;
      mockTm.schedule.mockImplementation(async () => {
        callCount++;
        return makeTaskInstance(`task-${callCount}`);
      });
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      const result = await scheduler.scheduleWorkflowTasks(
        makeWorkflow({
          definition: {
            triggers: [
              { type: 'scheduled', with: { every: '5m' } },
              { type: 'scheduled', with: { every: '1h' } },
            ],
            steps: [],
            name: 'Multi-trigger',
            enabled: true,
            version: '1',
          },
        }),
        'default',
        mockRequest
      );

      expect(result).toEqual(['task-1', 'task-2']);
      expect(mockTm.schedule).toHaveBeenCalledTimes(2);
    });

    it('propagates error from first failing trigger and stops scheduling', async () => {
      const mockTm = makeMockTaskManager();
      mockTm.schedule
        .mockResolvedValueOnce(makeTaskInstance('task-1'))
        .mockRejectedValueOnce(new Error('connection refused'));
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      await expect(
        scheduler.scheduleWorkflowTasks(
          makeWorkflow({
            definition: {
              triggers: [
                { type: 'scheduled', with: { every: '5m' } },
                { type: 'scheduled', with: { every: '1h' } },
              ],
              steps: [],
              name: 'Fail',
              enabled: true,
              version: '1',
            },
          }),
          'default',
          mockRequest
        )
      ).rejects.toThrow('connection refused');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to schedule workflow task')
      );
    });
  });

  describe('schedule timing when changing identity', () => {
    const taskId = 'workflow:test-workflow:scheduled';
    const scheduledAt = new Date('2030-01-01T10:00:00.000Z');
    const runAt = new Date('2030-01-01T15:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2030-01-01T14:20:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const createScheduler = (oldAccount?: string, schedule = { interval: '1h' }) => {
      const mockTm = makeMockTaskManager();
      mockTm.schedule.mockRejectedValueOnce({ statusCode: 409 });
      mockTm.get.mockResolvedValue(
        makeTaskInstance(taskId, {
          scheduledAt,
          runAt,
          schedule,
          credential: oldAccount
            ? {
                type: 'service_account',
                workloadType: 'workflow',
                workloadId: 'test-workflow',
                spaceId: 'default',
                expectedServiceAccountId: oldAccount,
              }
            : undefined,
        })
      );
      return { mockTm, scheduler: new WorkflowTaskScheduler(mockLogger, mockTm) };
    };

    it.each([
      { oldAccount: undefined, newAccount: 'account-a' },
      { oldAccount: 'account-a', newAccount: 'account-b' },
      { oldAccount: 'account-a', newAccount: undefined },
    ])(
      'keeps the next tick when changing $oldAccount to $newAccount',
      async ({ oldAccount, newAccount }) => {
        const { mockTm, scheduler } = createScheduler(oldAccount);

        await scheduler.scheduleWorkflowTask(
          'test-workflow',
          'default',
          { type: 'scheduled', with: { every: '1h' } },
          mockRequest,
          newAccount
        );

        expect(mockTm.schedule).toHaveBeenCalledTimes(2);
        expect(mockTm.schedule).toHaveBeenLastCalledWith(
          expect.objectContaining({ scheduledAt, runAt, schedule: { interval: '1h' } }),
          { request: mockRequest }
        );
      }
    );

    it('uses the existing anchor when the identity and interval change together', async () => {
      const { mockTm, scheduler } = createScheduler('account-a');

      await scheduler.scheduleWorkflowTask(
        'test-workflow',
        'default',
        { type: 'scheduled', with: { every: '8h' } },
        mockRequest,
        'account-b'
      );

      expect(mockTm.schedule).toHaveBeenLastCalledWith(
        expect.objectContaining({
          scheduledAt,
          runAt: new Date('2030-01-01T18:00:00.000Z'),
          schedule: { interval: '8h' },
        }),
        { request: mockRequest }
      );
    });

    it('keeps the next tick of an unchanged RRule schedule', async () => {
      const { mockTm, scheduler } = createScheduler('account-a');
      mockTm.get.mockResolvedValue(
        makeTaskInstance(taskId, {
          scheduledAt,
          runAt,
          schedule: {
            rrule: { freq: Frequency.DAILY, interval: 1, tzid: 'UTC', byhour: [15], byminute: [0] },
          },
          credential: {
            type: 'service_account',
            workloadType: 'workflow',
            workloadId: 'test-workflow',
            spaceId: 'default',
            expectedServiceAccountId: 'account-a',
          },
        })
      );

      await scheduler.scheduleWorkflowTask(
        'test-workflow',
        'default',
        {
          type: 'scheduled',
          with: { rrule: { freq: 'DAILY', interval: 1, tzid: 'UTC', byhour: [15], byminute: [0] } },
        },
        mockRequest,
        'account-b'
      );

      expect(mockTm.schedule).toHaveBeenLastCalledWith(
        expect.objectContaining({ scheduledAt, runAt }),
        { request: mockRequest }
      );
    });
  });

  describe('scheduleWorkflowTask — idempotent conflict handling', () => {
    it('falls back to bulkUpdateSchedules on 409 conflict', async () => {
      const conflictError = new Error('Conflict') as Error & { statusCode: number };
      conflictError.statusCode = 409;
      const mockTm = makeMockTaskManager();
      mockTm.schedule.mockRejectedValueOnce(conflictError);
      mockTm.bulkUpdateSchedules.mockResolvedValueOnce({
        tasks: [makeTaskInstance('workflow:test-workflow:scheduled')],
        errors: [],
      });
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      const result = await scheduler.scheduleWorkflowTasks(makeWorkflow(), 'default', mockRequest);

      expect(result).toEqual(['workflow:test-workflow:scheduled']);
      expect(mockTm.bulkUpdateSchedules).toHaveBeenCalledWith(
        ['workflow:test-workflow:scheduled'],
        expect.objectContaining({ interval: '30s' }),
        { request: mockRequest, regenerateApiKey: true }
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Updated existing scheduled task')
      );
    });

    it('recreates the task when bulkUpdateSchedules skips it', async () => {
      const conflictError = new Error('Conflict') as Error & { statusCode: number };
      conflictError.statusCode = 409;
      const scheduledAt = new Date('2030-01-01T00:00:00.000Z');
      const mockTm = makeMockTaskManager();
      mockTm.schedule
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(makeTaskInstance('workflow:test-workflow:scheduled'));
      mockTm.get.mockResolvedValueOnce(
        makeTaskInstance('workflow:test-workflow:scheduled', { scheduledAt })
      );
      mockTm.bulkUpdateSchedules.mockResolvedValueOnce({
        tasks: [],
        errors: [],
      });
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      const result = await scheduler.scheduleWorkflowTasks(makeWorkflow(), 'default', mockRequest);

      expect(result).toEqual(['workflow:test-workflow:scheduled']);
      expect(mockTm.get).toHaveBeenCalledWith('workflow:test-workflow:scheduled');
      expect(mockTm.removeIfExists).toHaveBeenCalledWith('workflow:test-workflow:scheduled');
      expect(mockTm.schedule).toHaveBeenCalledTimes(2);
      expect(mockTm.schedule).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'workflow:test-workflow:scheduled',
          schedule: expect.objectContaining({ interval: '30s' }),
          scheduledAt,
          runAt: new Date('2030-01-01T00:00:30.000Z'),
        }),
        { request: mockRequest }
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Recreated scheduled task')
      );
    });

    it('propagates non-409 errors from schedule', async () => {
      const serverError = new Error('Server error') as Error & { statusCode: number };
      serverError.statusCode = 500;
      const mockTm = makeMockTaskManager();
      mockTm.schedule.mockRejectedValueOnce(serverError);
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      await expect(
        scheduler.scheduleWorkflowTasks(makeWorkflow(), 'default', mockRequest)
      ).rejects.toThrow('Server error');
      expect(mockTm.bulkUpdateSchedules).not.toHaveBeenCalled();
    });

    it('recreates the task after a 409 error from bulkUpdateSchedules', async () => {
      const conflictError = new Error('Conflict') as Error & { statusCode: number };
      conflictError.statusCode = 409;
      const mockTm = makeMockTaskManager();
      mockTm.schedule
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(makeTaskInstance('workflow:test-workflow:scheduled'));
      mockTm.bulkUpdateSchedules.mockResolvedValueOnce({
        tasks: [],
        errors: [makeBulkError('task-1', 409, 'conflict')],
      });
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      const result = await scheduler.scheduleWorkflowTasks(makeWorkflow(), 'default', mockRequest);

      expect(result).toEqual(['workflow:test-workflow:scheduled']);
      expect(mockTm.removeIfExists).toHaveBeenCalledWith('workflow:test-workflow:scheduled');
    });

    it('recreates the task after a 404 error from bulkUpdateSchedules', async () => {
      const conflictError = new Error('Conflict') as Error & { statusCode: number };
      conflictError.statusCode = 409;
      const notFoundError = new Error('Not found') as Error & { statusCode: number };
      notFoundError.statusCode = 404;
      const mockTm = makeMockTaskManager();
      mockTm.schedule
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(makeTaskInstance('workflow:test-workflow:scheduled'));
      mockTm.get.mockRejectedValueOnce(notFoundError);
      mockTm.bulkUpdateSchedules.mockResolvedValueOnce({
        tasks: [],
        errors: [makeBulkError('task-1', 404, 'not found')],
      });
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      const result = await scheduler.scheduleWorkflowTasks(makeWorkflow(), 'default', mockRequest);

      expect(result).toEqual(['workflow:test-workflow:scheduled']);
      expect(mockTm.get).toHaveBeenCalledWith('workflow:test-workflow:scheduled');
      expect(mockTm.removeIfExists).toHaveBeenCalledWith('workflow:test-workflow:scheduled');
    });

    it('throws on non-retriable error from bulkUpdateSchedules', async () => {
      const conflictError = new Error('Conflict') as Error & { statusCode: number };
      conflictError.statusCode = 409;
      const mockTm = makeMockTaskManager();
      mockTm.schedule.mockRejectedValueOnce(conflictError);
      mockTm.bulkUpdateSchedules.mockResolvedValueOnce({
        tasks: [],
        errors: [makeBulkError('task-1', 500, 'internal error')],
      });
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      await expect(
        scheduler.scheduleWorkflowTasks(makeWorkflow(), 'default', mockRequest)
      ).rejects.toThrow('Failed to update schedule for workflow task');
    });
  });

  describe('unscheduleWorkflowTasks', () => {
    it('removes scheduled task by id', async () => {
      const mockTm = makeMockTaskManager();
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      await scheduler.unscheduleWorkflowTasks('wf-1');

      expect(mockTm.fetch).not.toHaveBeenCalled();
      expect(mockTm.bulkRemove).not.toHaveBeenCalled();
      expect(mockTm.removeIfExists).toHaveBeenCalledWith('workflow:wf-1:scheduled');
    });

    it('logs error and re-throws when removeIfExists fails', async () => {
      const mockTm = makeMockTaskManager();
      mockTm.removeIfExists.mockRejectedValueOnce(new Error('remove failed'));
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      await expect(scheduler.unscheduleWorkflowTasks('wf-1')).rejects.toThrow('remove failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('bulkUnscheduleWorkflowTasks', () => {
    it('bulk-removes scheduled tasks by id', async () => {
      const mockTm = makeMockTaskManager();
      mockTm.bulkRemove.mockResolvedValueOnce({
        statuses: [makeBulkRemoveStatus('wf-1', true), makeBulkRemoveStatus('wf-2', true)],
      });
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      await scheduler.bulkUnscheduleWorkflowTasks(['wf-1', 'wf-2']);

      expect(mockTm.fetch).not.toHaveBeenCalled();
      expect(mockTm.bulkRemove).toHaveBeenCalledWith([
        'workflow:wf-1:scheduled',
        'workflow:wf-2:scheduled',
      ]);
    });

    it('does nothing when workflowIds is empty', async () => {
      const mockTm = makeMockTaskManager();
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      await scheduler.bulkUnscheduleWorkflowTasks([]);

      expect(mockTm.bulkRemove).not.toHaveBeenCalled();
    });

    it('ignores 404 from bulkRemove', async () => {
      const mockTm = makeMockTaskManager();
      mockTm.bulkRemove.mockResolvedValueOnce({
        statuses: [makeBulkRemoveStatus('wf-1', true), makeBulkRemoveStatus('wf-2', false, 404)],
      });
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      await scheduler.bulkUnscheduleWorkflowTasks(['wf-1', 'wf-2']);

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('logs warnings for non-404 failures without throwing', async () => {
      const mockTm = makeMockTaskManager();
      mockTm.bulkRemove.mockResolvedValueOnce({
        statuses: [
          makeBulkRemoveStatus('wf-1', true),
          makeBulkRemoveStatus('wf-2', false, 500, 'delete failed'),
          makeBulkRemoveStatus('wf-3', false, 503, 'unavailable'),
        ],
      });
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      await expect(
        scheduler.bulkUnscheduleWorkflowTasks(['wf-1', 'wf-2', 'wf-3'])
      ).resolves.toBeUndefined();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to unschedule tasks for deleted workflow wf-2')
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to unschedule tasks for deleted workflow wf-3')
      );
    });

    it('logs error but does not throw when bulkRemove fails', async () => {
      const mockTm = makeMockTaskManager();
      mockTm.bulkRemove.mockRejectedValueOnce(new Error('ES unavailable'));
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      await expect(scheduler.bulkUnscheduleWorkflowTasks(['wf-1'])).resolves.toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to bulk unschedule workflow tasks')
      );
    });
  });

  describe('updateWorkflowTasks', () => {
    it('delegates to scheduleWorkflowTasks without deleting first (idempotent)', async () => {
      const mockTm = makeMockTaskManager();
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      await scheduler.updateWorkflowTasks(makeWorkflow(), 'default', mockRequest);

      expect(mockTm.fetch).not.toHaveBeenCalled();
      expect(mockTm.removeIfExists).not.toHaveBeenCalled();
      expect(mockTm.schedule).toHaveBeenCalledTimes(1);
    });
  });

  describe('logging', () => {
    it('logs RRule scheduling details with readable format', async () => {
      const mockTm = makeMockTaskManager();
      const scheduler = new WorkflowTaskScheduler(mockLogger, mockTm);

      await scheduler.scheduleWorkflowTasks(
        makeWorkflow({
          definition: {
            triggers: [
              {
                type: 'scheduled',
                with: {
                  rrule: { freq: 'DAILY', interval: 1, tzid: 'UTC', byhour: [9], byminute: [0] },
                },
              },
            ],
            steps: [],
            name: 'RRule',
            enabled: false,
            version: '1',
          },
        }),
        'default',
        mockRequest
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('RRule schedule created')
      );
    });
  });
});
