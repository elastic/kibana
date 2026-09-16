/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { TaskAlreadyRunningError } from '@kbn/task-manager-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
import {
  drainConcurrencyQueueSlots,
  isRecoverablePromoteRunSoonError,
  maybeDrainConcurrencyQueueAfterTerminal,
} from './concurrency_queue_drainer';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

describe('isRecoverablePromoteRunSoonError', () => {
  it('returns true for known infrastructure blips', () => {
    expect(
      isRecoverablePromoteRunSoonError(
        SavedObjectsErrorHelpers.decorateEsUnavailableError(new Error('ES unavailable'))
      )
    ).toBe(true);
    expect(
      isRecoverablePromoteRunSoonError(
        SavedObjectsErrorHelpers.createTooManyRequestsError('task', 'workflow:exec-1:manual')
      )
    ).toBe(true);
    expect(isRecoverablePromoteRunSoonError(429)).toBe(true);
    expect(isRecoverablePromoteRunSoonError({ statusCode: 503 })).toBe(true);
  });

  it('does not treat task-not-found as recoverable (re-queue poison pill)', () => {
    // Real Task Manager / SO shape from:
    // "Saved object [task/workflow:{id}:scheduled] not found"
    const taskId = 'workflow:04e6e2a6-0000-4000-8000-000000000001:scheduled';
    const soNotFound = SavedObjectsErrorHelpers.createGenericNotFoundError('task', taskId);

    expect(SavedObjectsErrorHelpers.isNotFoundError(soNotFound)).toBe(true);
    expect(soNotFound.message).toContain(`Saved object [task/${taskId}] not found`);
    expect(isRecoverablePromoteRunSoonError(soNotFound)).toBe(false);

    // Plain Error with the same message must also stay unrecoverable.
    expect(
      isRecoverablePromoteRunSoonError(new Error(`Saved object [task/${taskId}] not found`))
    ).toBe(false);
  });

  it('returns false for unknown errors', () => {
    expect(isRecoverablePromoteRunSoonError(new Error('unexpected boom'))).toBe(false);
    expect(isRecoverablePromoteRunSoonError(500)).toBe(false);
    expect(isRecoverablePromoteRunSoonError({ statusCode: 404 })).toBe(false);
  });
});

describe('drainConcurrencyQueueSlots', () => {
  const runSoonMock = jest.fn().mockResolvedValue(undefined);
  const promoteQueuedRunTask = jest.fn().mockImplementation(async () => {
    runSoonMock();
  });
  const workflowTaskManager = {
    promoteQueuedRunTask,
  } as unknown as WorkflowTaskManager;

  const baseParams = {
    workflowTaskManager,
    logger: { debug: jest.fn(), warn: jest.fn() } as unknown as Logger,
    spaceId: 'default',
    concurrencyGroupKey: 'g1',
    concurrencySettings: { key: 'g1', strategy: 'queue' as const, max: 1 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('promotes at most one queued execution per drain when max is 1', async () => {
    const countMock = jest.fn().mockResolvedValueOnce(0).mockResolvedValue(1);
    const workflowExecutionRepository = {
      countExecutionsByConcurrencyGroupAndStatuses: countMock,
      getOldestQueuedExecutionIdByConcurrencyGroup: jest.fn().mockResolvedValue('exec-queued-1'),
      tryCasPromoteQueuedWorkflowExecutionToPending: jest.fn().mockResolvedValue(true),
      getWorkflowExecutionById: jest.fn().mockResolvedValue({
        id: 'exec-queued-1',
        spaceId: 'default',
        triggeredBy: 'manual',
        status: ExecutionStatus.PENDING,
      }),
      updateWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    } as unknown as WorkflowExecutionRepository;

    await drainConcurrencyQueueSlots({
      ...baseParams,
      workflowExecutionRepository,
    });

    expect(promoteQueuedRunTask).toHaveBeenCalledTimes(1);
    expect(promoteQueuedRunTask).toHaveBeenCalledWith({
      executionId: 'exec-queued-1',
      triggeredBy: 'manual',
    });
    expect(countMock).toHaveBeenCalledTimes(2);
  });

  it('promotes twice in one drain when max is 2 and slot count stays below max', async () => {
    const countMock = jest
      .fn()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValue(2);
    const oldestMock = jest
      .fn()
      .mockResolvedValueOnce('exec-q1')
      .mockResolvedValueOnce('exec-q2')
      .mockResolvedValue(null);
    const promoteMock = jest.fn().mockResolvedValue(true);
    const getByIdMock = jest.fn().mockImplementation((_id: string) =>
      Promise.resolve({
        id: _id,
        spaceId: 'default',
        triggeredBy: 'manual',
        status: ExecutionStatus.PENDING,
      })
    );

    const workflowExecutionRepository = {
      countExecutionsByConcurrencyGroupAndStatuses: countMock,
      getOldestQueuedExecutionIdByConcurrencyGroup: oldestMock,
      tryCasPromoteQueuedWorkflowExecutionToPending: promoteMock,
      getWorkflowExecutionById: getByIdMock,
      updateWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    } as unknown as WorkflowExecutionRepository;

    await drainConcurrencyQueueSlots({
      ...baseParams,
      workflowExecutionRepository,
      concurrencySettings: { key: 'g1', strategy: 'queue', max: 2 },
    });

    expect(promoteQueuedRunTask).toHaveBeenCalledTimes(2);
  });

  it('retries runSoon after a short delay when the dormant task is not ready yet', async () => {
    jest.useFakeTimers();
    promoteQueuedRunTask
      .mockRejectedValueOnce(new Error('task not found'))
      .mockRejectedValueOnce(new Error('task not found'))
      .mockResolvedValueOnce(undefined);

    const updateMock = jest.fn().mockResolvedValue(undefined);
    const workflowExecutionRepository = {
      countExecutionsByConcurrencyGroupAndStatuses: jest
        .fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValue(1),
      getOldestQueuedExecutionIdByConcurrencyGroup: jest.fn().mockResolvedValue('exec-queued-1'),
      tryCasPromoteQueuedWorkflowExecutionToPending: jest.fn().mockResolvedValue(true),
      getWorkflowExecutionById: jest.fn().mockResolvedValue({
        id: 'exec-queued-1',
        spaceId: 'default',
        triggeredBy: 'manual',
        status: ExecutionStatus.PENDING,
      }),
      updateWorkflowExecution: updateMock,
    } as unknown as WorkflowExecutionRepository;

    const drainPromise = drainConcurrencyQueueSlots({
      ...baseParams,
      workflowExecutionRepository,
    });

    await jest.advanceTimersByTimeAsync(500);
    await drainPromise;

    expect(promoteQueuedRunTask).toHaveBeenCalledTimes(3);
    expect(updateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: ExecutionStatus.QUEUED }),
      expect.anything()
    );
    jest.useRealTimers();
  });

  it('marks corrupt promoted docs as skipped and continues draining', async () => {
    const countMock = jest
      .fn()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValue(1);
    const oldestMock = jest
      .fn()
      .mockResolvedValueOnce('exec-corrupt')
      .mockResolvedValueOnce('exec-valid')
      .mockResolvedValue(null);
    const updateMock = jest.fn().mockResolvedValue(undefined);
    const getByIdMock = jest
      .fn()
      .mockResolvedValueOnce({
        status: ExecutionStatus.PENDING,
        spaceId: undefined,
      })
      .mockResolvedValueOnce({
        id: 'exec-valid',
        spaceId: 'default',
        triggeredBy: 'manual',
        status: ExecutionStatus.PENDING,
      });

    const workflowExecutionRepository = {
      countExecutionsByConcurrencyGroupAndStatuses: countMock,
      getOldestQueuedExecutionIdByConcurrencyGroup: oldestMock,
      tryCasPromoteQueuedWorkflowExecutionToPending: jest.fn().mockResolvedValue(true),
      getWorkflowExecutionById: getByIdMock,
      updateWorkflowExecution: updateMock,
    } as unknown as WorkflowExecutionRepository;

    await drainConcurrencyQueueSlots({
      ...baseParams,
      workflowExecutionRepository,
      concurrencySettings: { key: 'g1', strategy: 'queue', max: 2 },
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'exec-corrupt',
        status: ExecutionStatus.SKIPPED,
        cancellationReason: expect.stringContaining('missing id or spaceId'),
      }),
      { refresh: 'wait_for' }
    );
    expect(promoteQueuedRunTask).toHaveBeenCalledTimes(1);
    expect(promoteQueuedRunTask).toHaveBeenCalledWith({
      executionId: 'exec-valid',
      triggeredBy: 'manual',
    });
  });

  it('defaults missing triggeredBy to manual when promoting', async () => {
    const countMock = jest.fn().mockResolvedValueOnce(0).mockResolvedValue(1);
    const workflowExecutionRepository = {
      countExecutionsByConcurrencyGroupAndStatuses: countMock,
      getOldestQueuedExecutionIdByConcurrencyGroup: jest.fn().mockResolvedValue('exec-queued-1'),
      tryCasPromoteQueuedWorkflowExecutionToPending: jest.fn().mockResolvedValue(true),
      getWorkflowExecutionById: jest.fn().mockResolvedValue({
        id: 'exec-queued-1',
        spaceId: 'default',
        triggeredBy: undefined,
        status: ExecutionStatus.PENDING,
      }),
      updateWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    } as unknown as WorkflowExecutionRepository;

    await drainConcurrencyQueueSlots({
      ...baseParams,
      workflowExecutionRepository,
    });

    expect(promoteQueuedRunTask).toHaveBeenCalledWith({
      executionId: 'exec-queued-1',
      triggeredBy: 'manual',
    });
  });

  it('marks failed when runSoon fails permanently (task not found) and continues draining', async () => {
    jest.useFakeTimers();
    promoteQueuedRunTask.mockImplementation(async ({ executionId }: { executionId: string }) => {
      if (executionId === 'exec-missing') {
        throw SavedObjectsErrorHelpers.createGenericNotFoundError(
          'task',
          'workflow:exec-missing:manual'
        );
      }
    });

    const countMock = jest
      .fn()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValue(1);
    const oldestMock = jest
      .fn()
      .mockResolvedValueOnce('exec-missing')
      .mockResolvedValueOnce('exec-valid')
      .mockResolvedValue(null);
    const updateMock = jest.fn().mockResolvedValue(undefined);
    const getByIdMock = jest.fn().mockImplementation((id: string) =>
      Promise.resolve({
        id,
        spaceId: 'default',
        triggeredBy: 'manual',
        status: ExecutionStatus.PENDING,
      })
    );

    const workflowExecutionRepository = {
      countExecutionsByConcurrencyGroupAndStatuses: countMock,
      getOldestQueuedExecutionIdByConcurrencyGroup: oldestMock,
      tryCasPromoteQueuedWorkflowExecutionToPending: jest.fn().mockResolvedValue(true),
      getWorkflowExecutionById: getByIdMock,
      updateWorkflowExecution: updateMock,
    } as unknown as WorkflowExecutionRepository;

    const drainPromise = drainConcurrencyQueueSlots({
      ...baseParams,
      workflowExecutionRepository,
      concurrencySettings: { key: 'g1', strategy: 'queue', max: 2 },
    });

    // 3 delays between 4 not-found attempts for the missing task
    await jest.advanceTimersByTimeAsync(750);
    await drainPromise;

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'exec-missing',
        status: ExecutionStatus.FAILED,
        error: {
          type: 'QueuePromoteRunSoonError',
          message: 'Failed to start queued workflow execution due to an unrecoverable error.',
        },
        finishedAt: expect.any(String),
      }),
      { refresh: 'wait_for' }
    );
    expect(promoteQueuedRunTask).toHaveBeenCalledWith({
      executionId: 'exec-valid',
      triggeredBy: 'manual',
    });
    expect(updateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'exec-valid' }),
      expect.anything()
    );
    expect(updateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: ExecutionStatus.QUEUED }),
      expect.anything()
    );
    jest.useRealTimers();
  });

  it('reverts to queued on recoverable runSoon failures', async () => {
    jest.useFakeTimers();
    promoteQueuedRunTask.mockRejectedValue(
      SavedObjectsErrorHelpers.decorateEsUnavailableError(new Error('ES unavailable'))
    );

    const updateMock = jest.fn().mockResolvedValue(undefined);
    const workflowExecutionRepository = {
      countExecutionsByConcurrencyGroupAndStatuses: jest.fn().mockResolvedValue(0),
      getOldestQueuedExecutionIdByConcurrencyGroup: jest.fn().mockResolvedValue('exec-queued-1'),
      tryCasPromoteQueuedWorkflowExecutionToPending: jest.fn().mockResolvedValue(true),
      getWorkflowExecutionById: jest.fn().mockResolvedValue({
        id: 'exec-queued-1',
        spaceId: 'default',
        triggeredBy: 'manual',
        status: ExecutionStatus.PENDING,
      }),
      updateWorkflowExecution: updateMock,
    } as unknown as WorkflowExecutionRepository;

    const drainPromise = drainConcurrencyQueueSlots({
      ...baseParams,
      workflowExecutionRepository,
    });

    await jest.advanceTimersByTimeAsync(750);
    await drainPromise;

    expect(updateMock).toHaveBeenCalledWith(
      { id: 'exec-queued-1', status: ExecutionStatus.QUEUED },
      { refresh: 'wait_for' }
    );
    expect(promoteQueuedRunTask).toHaveBeenCalledTimes(4);
    jest.useRealTimers();
  });

  it('marks failed on unknown runSoon errors', async () => {
    jest.useFakeTimers();
    promoteQueuedRunTask.mockRejectedValue(new Error('unexpected boom'));

    const updateMock = jest.fn().mockResolvedValue(undefined);
    const workflowExecutionRepository = {
      countExecutionsByConcurrencyGroupAndStatuses: jest
        .fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValue(1),
      getOldestQueuedExecutionIdByConcurrencyGroup: jest.fn().mockResolvedValue('exec-queued-1'),
      tryCasPromoteQueuedWorkflowExecutionToPending: jest.fn().mockResolvedValue(true),
      getWorkflowExecutionById: jest.fn().mockResolvedValue({
        id: 'exec-queued-1',
        spaceId: 'default',
        triggeredBy: 'manual',
        status: ExecutionStatus.PENDING,
      }),
      updateWorkflowExecution: updateMock,
    } as unknown as WorkflowExecutionRepository;

    const drainPromise = drainConcurrencyQueueSlots({
      ...baseParams,
      workflowExecutionRepository,
    });

    await jest.advanceTimersByTimeAsync(750);
    await drainPromise;

    expect(promoteQueuedRunTask).toHaveBeenCalledTimes(4);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'exec-queued-1',
        status: ExecutionStatus.FAILED,
        error: {
          type: 'QueuePromoteRunSoonError',
          message: 'Failed to start queued workflow execution due to an unrecoverable error.',
        },
      }),
      { refresh: 'wait_for' }
    );
    jest.useRealTimers();
  });

  it('leaves pending when runSoon reports the task is already running', async () => {
    promoteQueuedRunTask.mockRejectedValue(
      new TaskAlreadyRunningError('workflow:exec-queued-1:manual')
    );

    const updateMock = jest.fn().mockResolvedValue(undefined);
    const workflowExecutionRepository = {
      countExecutionsByConcurrencyGroupAndStatuses: jest
        .fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValue(1),
      getOldestQueuedExecutionIdByConcurrencyGroup: jest.fn().mockResolvedValue('exec-queued-1'),
      tryCasPromoteQueuedWorkflowExecutionToPending: jest.fn().mockResolvedValue(true),
      getWorkflowExecutionById: jest.fn().mockResolvedValue({
        id: 'exec-queued-1',
        spaceId: 'default',
        triggeredBy: 'manual',
        status: ExecutionStatus.PENDING,
      }),
      updateWorkflowExecution: updateMock,
    } as unknown as WorkflowExecutionRepository;

    await drainConcurrencyQueueSlots({
      ...baseParams,
      workflowExecutionRepository,
    });

    expect(promoteQueuedRunTask).toHaveBeenCalledTimes(1);
    expect(updateMock).not.toHaveBeenCalled();
  });
});

describe('maybeDrainConcurrencyQueueAfterTerminal', () => {
  const promoteQueuedRunTask = jest.fn().mockResolvedValue(undefined);
  const workflowTaskManager = {
    promoteQueuedRunTask,
  } as unknown as WorkflowTaskManager;
  const debugMock = jest.fn();
  const baseParams = {
    workflowTaskManager,
    logger: { debug: debugMock, warn: jest.fn() } as unknown as Logger,
    workflowRunId: 'exec-finished',
    spaceId: 'default',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('drains when the execution is terminal under queue concurrency', async () => {
    const getByIdMock = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'exec-finished',
        spaceId: 'default',
        status: ExecutionStatus.FAILED,
        concurrencyGroupKey: 'g1',
        workflowDefinition: {
          name: 'wf',
          enabled: true,
          version: '1',
          triggers: [],
          steps: [],
          settings: { concurrency: { key: 'g1', strategy: 'queue', max: 1 } },
        },
      })
      .mockResolvedValueOnce({
        id: 'exec-q1',
        spaceId: 'default',
        triggeredBy: 'manual',
        status: ExecutionStatus.PENDING,
      });
    const workflowExecutionRepository = {
      getWorkflowExecutionById: getByIdMock,
      countExecutionsByConcurrencyGroupAndStatuses: jest
        .fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValue(1),
      getOldestQueuedExecutionIdByConcurrencyGroup: jest.fn().mockResolvedValue('exec-q1'),
      tryCasPromoteQueuedWorkflowExecutionToPending: jest.fn().mockResolvedValue(true),
      updateWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    } as unknown as WorkflowExecutionRepository;

    await maybeDrainConcurrencyQueueAfterTerminal({
      ...baseParams,
      workflowExecutionRepository,
    });

    expect(promoteQueuedRunTask).toHaveBeenCalledTimes(1);
    expect(debugMock).toHaveBeenCalledWith(
      'Promoted queued execution exec-q1 to pending and runSoon queued workflow:run (group g1)'
    );
  });

  it('does not drain when the execution is not terminal', async () => {
    const workflowExecutionRepository = {
      getWorkflowExecutionById: jest.fn().mockResolvedValue({
        id: 'exec-finished',
        status: ExecutionStatus.QUEUED,
        concurrencyGroupKey: 'g1',
        workflowDefinition: {
          settings: { concurrency: { key: 'g1', strategy: 'queue', max: 1 } },
        },
      }),
    } as unknown as WorkflowExecutionRepository;

    await maybeDrainConcurrencyQueueAfterTerminal({
      ...baseParams,
      workflowExecutionRepository,
    });

    expect(promoteQueuedRunTask).not.toHaveBeenCalled();
    expect(debugMock).not.toHaveBeenCalled();
  });

  it('does not drain when concurrency strategy is not queue', async () => {
    const workflowExecutionRepository = {
      getWorkflowExecutionById: jest.fn().mockResolvedValue({
        id: 'exec-finished',
        status: ExecutionStatus.FAILED,
        concurrencyGroupKey: 'g1',
        workflowDefinition: {
          settings: { concurrency: { key: 'g1', strategy: 'drop', max: 1 } },
        },
      }),
    } as unknown as WorkflowExecutionRepository;

    await maybeDrainConcurrencyQueueAfterTerminal({
      ...baseParams,
      workflowExecutionRepository,
    });

    expect(promoteQueuedRunTask).not.toHaveBeenCalled();
  });

  it('logs debug and swallows drain errors', async () => {
    const workflowExecutionRepository = {
      getWorkflowExecutionById: jest.fn().mockResolvedValue({
        id: 'exec-finished',
        status: ExecutionStatus.FAILED,
        concurrencyGroupKey: 'g1',
        workflowDefinition: {
          settings: { concurrency: { key: 'g1', strategy: 'queue', max: 1 } },
        },
      }),
      countExecutionsByConcurrencyGroupAndStatuses: jest
        .fn()
        .mockRejectedValue(new Error('ES unavailable')),
    } as unknown as WorkflowExecutionRepository;

    await maybeDrainConcurrencyQueueAfterTerminal({
      ...baseParams,
      workflowExecutionRepository,
    });

    expect(debugMock).toHaveBeenCalledWith(
      'maybeDrainConcurrencyQueueAfterTerminal: drain failed for execution exec-finished: ES unavailable'
    );
  });
});
