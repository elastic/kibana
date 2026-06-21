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
import { ExecutionStatus } from '@kbn/workflows';
import { drainConcurrencyQueueSlots } from './concurrency_queue_drainer';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

describe('drainConcurrencyQueueSlots', () => {
  const scheduleMock = jest.fn().mockResolvedValue(undefined);
  const baseParams = {
    taskManager: { schedule: scheduleMock } as unknown as TaskManagerStartContract,
    logger: { debug: jest.fn(), warn: jest.fn() } as unknown as Logger,
    spaceId: 'default',
    concurrencyGroupKey: 'g1',
    concurrencySettings: { key: 'g1', strategy: 'queue' as const, max: 1 },
    request: {} as unknown as KibanaRequest,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules at most one promotion per drain when max is 1 and slot count reflects the new pending doc', async () => {
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

    expect(scheduleMock).toHaveBeenCalledTimes(1);
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

    expect(scheduleMock).toHaveBeenCalledTimes(2);
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
    expect(scheduleMock).toHaveBeenCalledTimes(1);
    expect(scheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'workflow:exec-valid:manual' }),
      expect.any(Object)
    );
  });

  it('defaults missing triggeredBy to manual when scheduling', async () => {
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

    expect(scheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'workflow:exec-queued-1:manual' }),
      expect.any(Object)
    );
  });
});
