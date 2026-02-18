/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { cancelDescendantExecutions } from './cancel_descendant_executions';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

const running = (id: string) => ({ id, status: ExecutionStatus.RUNNING });
const waiting = (id: string) => ({ id, status: ExecutionStatus.WAITING });

describe('cancelDescendantExecutions', () => {
  let workflowExecutionRepository: jest.Mocked<WorkflowExecutionRepository>;
  let workflowTaskManager: jest.Mocked<WorkflowTaskManager>;

  beforeEach(() => {
    workflowExecutionRepository = {
      getNonTerminalChildExecutions: jest.fn(),
      bulkUpdateWorkflowExecutions: jest.fn(),
    } as unknown as jest.Mocked<WorkflowExecutionRepository>;

    workflowTaskManager = {
      forceRunIdleTasks: jest.fn(),
    } as unknown as jest.Mocked<WorkflowTaskManager>;
  });

  it('should do nothing when there are no child executions', async () => {
    workflowExecutionRepository.getNonTerminalChildExecutions.mockResolvedValue([]);

    await cancelDescendantExecutions(
      'parent-exec-id',
      'default',
      workflowExecutionRepository,
      workflowTaskManager
    );

    expect(workflowExecutionRepository.getNonTerminalChildExecutions).toHaveBeenCalledWith(
      'parent-exec-id',
      'default'
    );
    expect(workflowExecutionRepository.bulkUpdateWorkflowExecutions).not.toHaveBeenCalled();
    expect(workflowTaskManager.forceRunIdleTasks).not.toHaveBeenCalled();
  });

  it('should cancel direct child executions', async () => {
    workflowExecutionRepository.getNonTerminalChildExecutions
      .mockResolvedValueOnce([running('child-1'), running('child-2')])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await cancelDescendantExecutions(
      'parent-exec-id',
      'default',
      workflowExecutionRepository,
      workflowTaskManager
    );

    expect(workflowExecutionRepository.bulkUpdateWorkflowExecutions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'child-1',
          cancelRequested: true,
          cancellationReason: 'Cancelled due to parent workflow cancellation',
          cancelledBy: 'system',
        }),
        expect.objectContaining({
          id: 'child-2',
          cancelRequested: true,
          cancellationReason: 'Cancelled due to parent workflow cancellation',
          cancelledBy: 'system',
        }),
      ])
    );

    expect(workflowTaskManager.forceRunIdleTasks).toHaveBeenCalledWith('child-1');
    expect(workflowTaskManager.forceRunIdleTasks).toHaveBeenCalledWith('child-2');
  });

  it('should set status to CANCELLED immediately for idle (WAITING/PENDING) children', async () => {
    workflowExecutionRepository.getNonTerminalChildExecutions
      .mockResolvedValueOnce([waiting('child-waiting'), running('child-running')])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await cancelDescendantExecutions(
      'parent-exec-id',
      'default',
      workflowExecutionRepository,
      workflowTaskManager
    );

    const bulkCall = workflowExecutionRepository.bulkUpdateWorkflowExecutions.mock.calls[0][0];

    const waitingUpdate = bulkCall.find((u) => u.id === 'child-waiting');
    expect(waitingUpdate).toEqual(
      expect.objectContaining({
        id: 'child-waiting',
        cancelRequested: true,
        status: ExecutionStatus.CANCELLED,
        finishedAt: expect.any(String),
      })
    );

    const runningUpdate = bulkCall.find((u) => u.id === 'child-running');
    expect(runningUpdate).toEqual(
      expect.objectContaining({
        id: 'child-running',
        cancelRequested: true,
      })
    );
    expect(runningUpdate!.status).toBeUndefined();
  });

  it('should recursively cancel grandchild executions', async () => {
    workflowExecutionRepository.getNonTerminalChildExecutions
      .mockResolvedValueOnce([running('child-1')])
      .mockResolvedValueOnce([running('grandchild-1'), running('grandchild-2')])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await cancelDescendantExecutions(
      'parent-exec-id',
      'default',
      workflowExecutionRepository,
      workflowTaskManager
    );

    expect(workflowExecutionRepository.bulkUpdateWorkflowExecutions).toHaveBeenCalledTimes(2);

    expect(workflowExecutionRepository.bulkUpdateWorkflowExecutions).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([expect.objectContaining({ id: 'child-1' })])
    );

    expect(workflowExecutionRepository.bulkUpdateWorkflowExecutions).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({ id: 'grandchild-1' }),
        expect.objectContaining({ id: 'grandchild-2' }),
      ])
    );

    expect(workflowTaskManager.forceRunIdleTasks).toHaveBeenCalledWith('child-1');
    expect(workflowTaskManager.forceRunIdleTasks).toHaveBeenCalledWith('grandchild-1');
    expect(workflowTaskManager.forceRunIdleTasks).toHaveBeenCalledWith('grandchild-2');
  });

  it('should handle deep nesting (3+ levels)', async () => {
    workflowExecutionRepository.getNonTerminalChildExecutions
      .mockResolvedValueOnce([running('child-1')])
      .mockResolvedValueOnce([running('grandchild-1')])
      .mockResolvedValueOnce([running('great-grandchild-1')])
      .mockResolvedValueOnce([]);

    await cancelDescendantExecutions(
      'parent-exec-id',
      'default',
      workflowExecutionRepository,
      workflowTaskManager
    );

    expect(workflowExecutionRepository.bulkUpdateWorkflowExecutions).toHaveBeenCalledTimes(3);
    expect(workflowTaskManager.forceRunIdleTasks).toHaveBeenCalledTimes(3);
    expect(workflowTaskManager.forceRunIdleTasks).toHaveBeenCalledWith('child-1');
    expect(workflowTaskManager.forceRunIdleTasks).toHaveBeenCalledWith('grandchild-1');
    expect(workflowTaskManager.forceRunIdleTasks).toHaveBeenCalledWith('great-grandchild-1');
  });

  it('should handle multiple children at each level (fan-out)', async () => {
    workflowExecutionRepository.getNonTerminalChildExecutions
      .mockResolvedValueOnce([running('child-1'), running('child-2')])
      .mockResolvedValueOnce([running('grandchild-1a'), running('grandchild-1b')])
      .mockResolvedValueOnce([running('grandchild-2a'), running('grandchild-2b')])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await cancelDescendantExecutions(
      'parent-exec-id',
      'default',
      workflowExecutionRepository,
      workflowTaskManager
    );

    expect(workflowExecutionRepository.bulkUpdateWorkflowExecutions).toHaveBeenCalledTimes(2);

    const secondBulkCall =
      workflowExecutionRepository.bulkUpdateWorkflowExecutions.mock.calls[1][0];
    const cancelledIds = secondBulkCall.map((update) => update.id);
    expect(cancelledIds).toEqual(
      expect.arrayContaining(['grandchild-1a', 'grandchild-1b', 'grandchild-2a', 'grandchild-2b'])
    );
  });

  it('should use custom cancellation reason when provided', async () => {
    workflowExecutionRepository.getNonTerminalChildExecutions
      .mockResolvedValueOnce([running('child-1')])
      .mockResolvedValueOnce([]);

    await cancelDescendantExecutions(
      'parent-exec-id',
      'default',
      workflowExecutionRepository,
      workflowTaskManager,
      'Custom cancellation reason'
    );

    expect(workflowExecutionRepository.bulkUpdateWorkflowExecutions).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'child-1',
        cancellationReason: 'Custom cancellation reason',
      }),
    ]);
  });
});
