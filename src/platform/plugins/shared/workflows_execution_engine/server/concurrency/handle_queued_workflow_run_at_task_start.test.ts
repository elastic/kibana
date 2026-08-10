/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';

import { handleQueuedWorkflowRunAtTaskStart } from './handle_queued_workflow_run_at_task_start';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

describe('handleQueuedWorkflowRunAtTaskStart', () => {
  const logger = loggingSystemMock.create().get() as Logger;
  const updateMock = jest.fn().mockResolvedValue(undefined);

  const workflowExecutionRepository = {
    updateWorkflowExecution: updateMock,
  } as unknown as WorkflowExecutionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2025-08-05T20:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns false when execution is not queued', async () => {
    const execution = {
      id: 'exec-1',
      status: ExecutionStatus.PENDING,
      createdAt: '2025-08-05T19:00:00.000Z',
    } as unknown as EsWorkflowExecution;

    const handled = await handleQueuedWorkflowRunAtTaskStart({
      execution,
      workflowRunId: 'exec-1',
      workflowExecutionRepository,
      logger,
    });

    expect(handled).toBe(false);
  });

  it('marks SKIPPED when queue TTL has elapsed', async () => {
    const execution = {
      id: 'exec-1',
      status: ExecutionStatus.QUEUED,
      createdAt: '2025-08-04T19:00:00.000Z',
      triggeredBy: 'manual',
      workflowDefinition: {
        name: 'wf',
        enabled: true,
        version: '1',
        triggers: [],
        steps: [],
        settings: { concurrency: { key: 'g1', strategy: 'queue', max: 1 } },
      },
    } as unknown as EsWorkflowExecution;

    const handled = await handleQueuedWorkflowRunAtTaskStart({
      execution,
      workflowRunId: 'exec-1',
      workflowExecutionRepository,
      logger,
    });

    expect(handled).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      id: 'exec-1',
      status: ExecutionStatus.SKIPPED,
      cancelRequested: true,
      cancellationReason: 'Queue wait exceeded (queue-ttl: 24h)',
      cancelledAt: '2025-08-05T20:00:00.000Z',
      cancelledBy: 'system',
    });
  });

  it('marks FAILED when the task runs before promotion', async () => {
    const execution = {
      id: 'exec-1',
      status: ExecutionStatus.QUEUED,
      createdAt: '2025-08-05T19:00:00.000Z',
      triggeredBy: 'alert',
      workflowDefinition: {
        name: 'wf',
        enabled: true,
        version: '1',
        triggers: [],
        steps: [],
        settings: { concurrency: { key: 'g1', strategy: 'queue', max: 1 } },
      },
    } as unknown as EsWorkflowExecution;

    const handled = await handleQueuedWorkflowRunAtTaskStart({
      execution,
      workflowRunId: 'exec-1',
      workflowExecutionRepository,
      logger,
    });

    expect(handled).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({
      id: 'exec-1',
      status: ExecutionStatus.FAILED,
      error: {
        type: 'QueueRunInvariantError',
        message:
          'Queue run task started before the execution was promoted from queued to pending; no recovery path exists for this state',
      },
      finishedAt: '2025-08-05T20:00:00.000Z',
    });
  });
});
