/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { type EsWorkflowExecution, ExecutionStatus } from '@kbn/workflows';
import { handlePostExecutionLoop } from './handle_post_execution_loop';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

const mockResumeSyncParentIfNeeded = jest.fn();
jest.mock('./resume_sync_parent_if_needed', () => ({
  resumeSyncParentIfNeeded: (...args: unknown[]) => mockResumeSyncParentIfNeeded(...args),
}));

const mockDrainConcurrencyQueueSlots = jest.fn();
jest.mock('../concurrency/concurrency_queue_drainer', () => ({
  drainConcurrencyQueueSlots: (...args: unknown[]) => mockDrainConcurrencyQueueSlots(...args),
}));

describe('handlePostExecutionLoop', () => {
  const workflowRunId = 'exec-1';
  const spaceId = 'default';
  const logger = loggingSystemMock.createLogger();
  let workflowExecutionRepository: jest.Mocked<
    Pick<WorkflowExecutionRepository, 'getWorkflowExecutionById' | 'updateWorkflowExecution'>
  >;
  let workflowTaskManager: jest.Mocked<Pick<WorkflowTaskManager, 'removeTasksForExecution'>>;

  const mockExecution = (overrides: Partial<EsWorkflowExecution>) =>
    workflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue({
      id: workflowRunId,
      spaceId,
      context: {},
      ...overrides,
    } as EsWorkflowExecution);

  const run = () =>
    handlePostExecutionLoop({
      workflowRunId,
      spaceId,
      logger,
      workflowExecutionRepository:
        workflowExecutionRepository as unknown as WorkflowExecutionRepository,
      workflowTaskManager: workflowTaskManager as unknown as WorkflowTaskManager,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockResumeSyncParentIfNeeded.mockResolvedValue(undefined);
    mockDrainConcurrencyQueueSlots.mockResolvedValue(undefined);
    workflowExecutionRepository = {
      getWorkflowExecutionById: jest.fn(),
      updateWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    };
    workflowTaskManager = { removeTasksForExecution: jest.fn().mockResolvedValue(undefined) };
  });

  it.each([ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED])(
    'removes the remaining tasks of a %s execution after resuming its sync parent',
    async (status) => {
      mockExecution({ status });

      await run();

      expect(workflowTaskManager.removeTasksForExecution).toHaveBeenCalledWith(workflowRunId);
      expect(mockResumeSyncParentIfNeeded.mock.invocationCallOrder[0]).toBeLessThan(
        workflowTaskManager.removeTasksForExecution.mock.invocationCallOrder[0]
      );
    }
  );

  it.each([ExecutionStatus.WAITING, ExecutionStatus.WAITING_FOR_INPUT, ExecutionStatus.RUNNING])(
    'keeps the tasks of a %s execution',
    async (status) => {
      mockExecution({ status });

      await run();

      expect(workflowTaskManager.removeTasksForExecution).not.toHaveBeenCalled();
    }
  );

  it('removes tasks once pending identity-failure cleanup is cleared', async () => {
    mockExecution({
      status: ExecutionStatus.FAILED,
      context: { serviceAccountFailureCleanupPending: true },
    });

    await run();

    expect(workflowTaskManager.removeTasksForExecution).toHaveBeenCalledTimes(1);
    expect(
      workflowExecutionRepository.updateWorkflowExecution.mock.invocationCallOrder[0]
    ).toBeLessThan(workflowTaskManager.removeTasksForExecution.mock.invocationCallOrder[0]);
  });

  it('keeps the tasks that retry identity-failure cleanup when it is still pending', async () => {
    mockExecution({
      status: ExecutionStatus.FAILED,
      context: { serviceAccountFailureCleanupPending: true },
    });
    mockResumeSyncParentIfNeeded.mockRejectedValue(new Error('parent unavailable'));

    await expect(run()).rejects.toThrow('parent unavailable');

    expect(workflowTaskManager.removeTasksForExecution).not.toHaveBeenCalled();
  });

  it('does not fail when task removal fails', async () => {
    mockExecution({ status: ExecutionStatus.COMPLETED });
    workflowTaskManager.removeTasksForExecution.mockRejectedValue(new Error('TM unavailable'));

    await expect(run()).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('TM unavailable'));
  });
});
