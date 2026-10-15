/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { failPendingExecutionAfterSchedulingError } from './fail_pending_execution_after_scheduling_error';

describe('scheduling failure cleanup', () => {
  const execution = (status = ExecutionStatus.PENDING): EsWorkflowExecution =>
    ({ id: 'run', status } as EsWorkflowExecution);
  const createRepository = () => ({
    getWorkflowExecutionWithVersion: jest
      .fn()
      .mockResolvedValue({ execution: execution(), seqNo: 1, primaryTerm: 1 }),
    tryUpdateWorkflowExecutionWithVersion: jest.fn().mockResolvedValue(true),
  });
  const cleanup = (workflowExecutionRepository: ReturnType<typeof createRepository>) =>
    failPendingExecutionAfterSchedulingError({
      workflowExecutionRepository,
      workflowRunId: 'run',
      spaceId: 'default',
      message: 'Failed to schedule',
    });

  it.each([
    ExecutionStatus.RUNNING,
    ExecutionStatus.WAITING_FOR_INPUT,
    ExecutionStatus.COMPLETED,
    ExecutionStatus.CANCELLED,
  ])('does not overwrite %s after an ambiguous scheduling failure', async (status) => {
    const repository = createRepository();
    repository.getWorkflowExecutionWithVersion.mockResolvedValue({
      execution: execution(status),
      seqNo: 1,
      primaryTerm: 1,
    });
    await cleanup(repository);
    expect(repository.tryUpdateWorkflowExecutionWithVersion).not.toHaveBeenCalled();
  });

  it('preserves a cancellation requested before scheduling failed', async () => {
    const repository = createRepository();
    repository.getWorkflowExecutionWithVersion.mockResolvedValue({
      execution: { ...execution(), cancelRequested: true, error: null },
      seqNo: 1,
      primaryTerm: 1,
    });
    await cleanup(repository);
    expect(repository.tryUpdateWorkflowExecutionWithVersion).toHaveBeenCalledWith(
      expect.objectContaining({ status: ExecutionStatus.CANCELLED, error: null }),
      { seqNo: 1, primaryTerm: 1 }
    );
  });

  it('does not overwrite a run that starts during cleanup', async () => {
    const repository = createRepository();
    repository.tryUpdateWorkflowExecutionWithVersion.mockResolvedValueOnce(false);
    repository.getWorkflowExecutionWithVersion
      .mockResolvedValueOnce({ execution: execution(), seqNo: 1, primaryTerm: 1 })
      .mockResolvedValueOnce({
        execution: execution(ExecutionStatus.RUNNING),
        seqNo: 2,
        primaryTerm: 1,
      });
    await cleanup(repository);
    expect(repository.tryUpdateWorkflowExecutionWithVersion).toHaveBeenCalledTimes(1);
  });

  it('reports repeated conflicts instead of claiming cleanup succeeded', async () => {
    const repository = createRepository();
    repository.tryUpdateWorkflowExecutionWithVersion.mockResolvedValue(false);
    await expect(cleanup(repository)).rejects.toThrow('kept changing');
  });
});
