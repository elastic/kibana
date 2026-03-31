/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import { tryWakeParentResumeTaskAfterSyncChildCompletion } from './try_wake_parent_resume_task_after_sync_child';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

describe('tryWakeParentResumeTaskAfterSyncChildCompletion', () => {
  const parentId = 'parent-exec-1';
  const childId = 'child-exec-1';
  const spaceId = 'default';

  const makeLogger = (): jest.Mocked<Pick<Logger, 'info' | 'warn'>> => ({
    info: jest.fn(),
    warn: jest.fn(),
  });

  const makeRepo = (): jest.Mocked<
    Pick<WorkflowExecutionRepository, 'getWorkflowExecutionById'>
  > => ({
    getWorkflowExecutionById: jest.fn(),
  });

  const makeTaskManager = (): jest.Mocked<Pick<WorkflowTaskManager, 'runTaskSoon'>> => ({
    runTaskSoon: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when finalExecution is null', async () => {
    const repo = makeRepo();
    const tm = makeTaskManager();
    const logger = makeLogger();

    await tryWakeParentResumeTaskAfterSyncChildCompletion({
      childWorkflowRunId: childId,
      finalExecution: null,
      spaceId,
      workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
      workflowTaskManager: tm as unknown as WorkflowTaskManager,
      logger: logger as unknown as Logger,
    });

    expect(repo.getWorkflowExecutionById).not.toHaveBeenCalled();
    expect(tm.runTaskSoon).not.toHaveBeenCalled();
  });

  it('does nothing when child is not terminal', async () => {
    const repo = makeRepo();
    const tm = makeTaskManager();
    const logger = makeLogger();

    await tryWakeParentResumeTaskAfterSyncChildCompletion({
      childWorkflowRunId: childId,
      finalExecution: {
        id: childId,
        status: ExecutionStatus.WAITING,
        context: {
          parentWorkflowInvocation: 'sync',
          parentWorkflowExecutionId: parentId,
        },
      } as any,
      spaceId,
      workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
      workflowTaskManager: tm as unknown as WorkflowTaskManager,
      logger: logger as unknown as Logger,
    });

    expect(repo.getWorkflowExecutionById).not.toHaveBeenCalled();
    expect(tm.runTaskSoon).not.toHaveBeenCalled();
  });

  it('does nothing when child was not sync-invoked by parent', async () => {
    const repo = makeRepo();
    const tm = makeTaskManager();
    const logger = makeLogger();

    await tryWakeParentResumeTaskAfterSyncChildCompletion({
      childWorkflowRunId: childId,
      finalExecution: {
        id: childId,
        status: ExecutionStatus.COMPLETED,
        context: {
          parentWorkflowInvocation: 'async',
          parentWorkflowExecutionId: parentId,
        },
      } as any,
      spaceId,
      workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
      workflowTaskManager: tm as unknown as WorkflowTaskManager,
      logger: logger as unknown as Logger,
    });

    expect(repo.getWorkflowExecutionById).not.toHaveBeenCalled();
    expect(tm.runTaskSoon).not.toHaveBeenCalled();
  });

  it('success: completed sync child wakes parent with latest pendingResumeTaskId from ES', async () => {
    const repo = makeRepo();
    const tm = makeTaskManager();
    const logger = makeLogger();
    const latestTaskId = 'resume-task-cycle-3';

    repo.getWorkflowExecutionById.mockResolvedValue({
      id: parentId,
      pendingResumeTaskId: latestTaskId,
    } as any);

    await tryWakeParentResumeTaskAfterSyncChildCompletion({
      childWorkflowRunId: childId,
      finalExecution: {
        id: childId,
        status: ExecutionStatus.COMPLETED,
        context: {
          parentWorkflowInvocation: 'sync',
          parentWorkflowExecutionId: parentId,
        },
      } as any,
      spaceId,
      workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
      workflowTaskManager: tm as unknown as WorkflowTaskManager,
      logger: logger as unknown as Logger,
    });

    expect(repo.getWorkflowExecutionById).toHaveBeenCalledWith(parentId, spaceId);
    expect(tm.runTaskSoon).toHaveBeenCalledTimes(1);
    expect(tm.runTaskSoon).toHaveBeenCalledWith(latestTaskId);
  });

  it.each([
    ['FAILED', ExecutionStatus.FAILED],
    ['CANCELLED', ExecutionStatus.CANCELLED],
    ['SKIPPED', ExecutionStatus.SKIPPED],
    ['TIMED_OUT', ExecutionStatus.TIMED_OUT],
  ] as const)(
    'non-completed terminal status %s still wakes parent (parent should observe failure)',
    async (_, status) => {
      const repo = makeRepo();
      const tm = makeTaskManager();
      const logger = makeLogger();

      repo.getWorkflowExecutionById.mockResolvedValue({
        id: parentId,
        pendingResumeTaskId: 'task-fail',
      } as any);

      await tryWakeParentResumeTaskAfterSyncChildCompletion({
        childWorkflowRunId: childId,
        finalExecution: {
          id: childId,
          status,
          context: {
            parentWorkflowInvocation: 'sync',
            parentWorkflowExecutionId: parentId,
          },
        } as any,
        spaceId,
        workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
        workflowTaskManager: tm as unknown as WorkflowTaskManager,
        logger: logger as unknown as Logger,
      });

      expect(tm.runTaskSoon).toHaveBeenCalledWith('task-fail');
    }
  );

  it('edge: parent document has no pendingResumeTaskId (in-process wait) — no runSoon, no throw', async () => {
    const repo = makeRepo();
    const tm = makeTaskManager();
    const logger = makeLogger();

    repo.getWorkflowExecutionById.mockResolvedValue({
      id: parentId,
      status: ExecutionStatus.WAITING,
    } as any);

    await tryWakeParentResumeTaskAfterSyncChildCompletion({
      childWorkflowRunId: childId,
      finalExecution: {
        id: childId,
        status: ExecutionStatus.COMPLETED,
        context: {
          parentWorkflowInvocation: 'sync',
          parentWorkflowExecutionId: parentId,
        },
      } as any,
      spaceId,
      workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
      workflowTaskManager: tm as unknown as WorkflowTaskManager,
      logger: logger as unknown as Logger,
    });

    expect(tm.runTaskSoon).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('edge: parent execution missing — no runSoon, no throw', async () => {
    const repo = makeRepo();
    const tm = makeTaskManager();

    repo.getWorkflowExecutionById.mockResolvedValue(null);

    await tryWakeParentResumeTaskAfterSyncChildCompletion({
      childWorkflowRunId: childId,
      finalExecution: {
        id: childId,
        status: ExecutionStatus.COMPLETED,
        context: {
          parentWorkflowInvocation: 'sync',
          parentWorkflowExecutionId: parentId,
        },
      } as any,
      spaceId,
      workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
      workflowTaskManager: tm as unknown as WorkflowTaskManager,
      logger: makeLogger() as unknown as Logger,
    });

    expect(tm.runTaskSoon).not.toHaveBeenCalled();
  });

  it('race-style: second wake uses id returned by fresh parent read (simulates new resume task each poll)', async () => {
    const repo = makeRepo();
    const tm = makeTaskManager();
    const logger = makeLogger();

    repo.getWorkflowExecutionById
      .mockResolvedValueOnce({ id: parentId, pendingResumeTaskId: 'task-A' } as any)
      .mockResolvedValueOnce({ id: parentId, pendingResumeTaskId: 'task-B' } as any);

    const finalExec = {
      id: childId,
      status: ExecutionStatus.COMPLETED,
      context: {
        parentWorkflowInvocation: 'sync',
        parentWorkflowExecutionId: parentId,
      },
    } as any;

    await tryWakeParentResumeTaskAfterSyncChildCompletion({
      childWorkflowRunId: 'child-1',
      finalExecution: finalExec,
      spaceId,
      workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
      workflowTaskManager: tm as unknown as WorkflowTaskManager,
      logger: logger as unknown as Logger,
    });
    await tryWakeParentResumeTaskAfterSyncChildCompletion({
      childWorkflowRunId: 'child-2',
      finalExecution: finalExec,
      spaceId,
      workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
      workflowTaskManager: tm as unknown as WorkflowTaskManager,
      logger: logger as unknown as Logger,
    });

    expect(tm.runTaskSoon).toHaveBeenNthCalledWith(1, 'task-A');
    expect(tm.runTaskSoon).toHaveBeenNthCalledWith(2, 'task-B');
  });

  it('runSoon failure logs warn and does not rethrow', async () => {
    const repo = makeRepo();
    const tm = makeTaskManager();
    const logger = makeLogger();

    repo.getWorkflowExecutionById.mockResolvedValue({
      id: parentId,
      pendingResumeTaskId: 'gone-task',
    } as any);
    tm.runTaskSoon.mockRejectedValue(new Error('Saved object [task/gone-task] not found'));

    await expect(
      tryWakeParentResumeTaskAfterSyncChildCompletion({
        childWorkflowRunId: childId,
        finalExecution: {
          id: childId,
          status: ExecutionStatus.COMPLETED,
          context: {
            parentWorkflowInvocation: 'sync',
            parentWorkflowExecutionId: parentId,
          },
        } as any,
        spaceId,
        workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
        workflowTaskManager: tm as unknown as WorkflowTaskManager,
        logger: logger as unknown as Logger,
      })
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to wake parent resume task')
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('gone-task'));
  });

  it('does nothing when child has no context (standalone root workflow)', async () => {
    const repo = makeRepo();
    const tm = makeTaskManager();
    const logger = makeLogger();

    await tryWakeParentResumeTaskAfterSyncChildCompletion({
      childWorkflowRunId: childId,
      finalExecution: {
        id: childId,
        status: ExecutionStatus.COMPLETED,
        context: {},
      } as any,
      spaceId,
      workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
      workflowTaskManager: tm as unknown as WorkflowTaskManager,
      logger: logger as unknown as Logger,
    });

    expect(repo.getWorkflowExecutionById).not.toHaveBeenCalled();
    expect(tm.runTaskSoon).not.toHaveBeenCalled();
  });

  it('does nothing when context is undefined', async () => {
    const repo = makeRepo();
    const tm = makeTaskManager();
    const logger = makeLogger();

    await tryWakeParentResumeTaskAfterSyncChildCompletion({
      childWorkflowRunId: childId,
      finalExecution: {
        id: childId,
        status: ExecutionStatus.COMPLETED,
        context: undefined,
      } as any,
      spaceId,
      workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
      workflowTaskManager: tm as unknown as WorkflowTaskManager,
      logger: logger as unknown as Logger,
    });

    expect(repo.getWorkflowExecutionById).not.toHaveBeenCalled();
    expect(tm.runTaskSoon).not.toHaveBeenCalled();
  });

  it('concurrent children of same parent both call runSoon without throwing', async () => {
    const repo = makeRepo();
    const tm = makeTaskManager();
    const logger = makeLogger();

    repo.getWorkflowExecutionById.mockResolvedValue({
      id: parentId,
      pendingResumeTaskId: 'same-task',
    } as any);

    const makeFinalExec = (cId: string) =>
      ({
        id: cId,
        status: ExecutionStatus.COMPLETED,
        context: {
          parentWorkflowInvocation: 'sync',
          parentWorkflowExecutionId: parentId,
        },
      } as any);

    await expect(
      Promise.all([
        tryWakeParentResumeTaskAfterSyncChildCompletion({
          childWorkflowRunId: 'child-a',
          finalExecution: makeFinalExec('child-a'),
          spaceId,
          workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
          workflowTaskManager: tm as unknown as WorkflowTaskManager,
          logger: logger as unknown as Logger,
        }),
        tryWakeParentResumeTaskAfterSyncChildCompletion({
          childWorkflowRunId: 'child-b',
          finalExecution: makeFinalExec('child-b'),
          spaceId,
          workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
          workflowTaskManager: tm as unknown as WorkflowTaskManager,
          logger: logger as unknown as Logger,
        }),
      ])
    ).resolves.toBeDefined();

    expect(tm.runTaskSoon).toHaveBeenCalledTimes(2);
    expect(tm.runTaskSoon).toHaveBeenCalledWith('same-task');
  });

  it('concurrent children: one runSoon fails, other succeeds — both resolve', async () => {
    const repo = makeRepo();
    const tm = makeTaskManager();
    const logger = makeLogger();

    repo.getWorkflowExecutionById.mockResolvedValue({
      id: parentId,
      pendingResumeTaskId: 'racy-task',
    } as any);

    tm.runTaskSoon.mockRejectedValueOnce(new Error('conflict')).mockResolvedValueOnce(undefined);

    const makeFinalExec = (cId: string) =>
      ({
        id: cId,
        status: ExecutionStatus.COMPLETED,
        context: {
          parentWorkflowInvocation: 'sync',
          parentWorkflowExecutionId: parentId,
        },
      } as any);

    await expect(
      Promise.all([
        tryWakeParentResumeTaskAfterSyncChildCompletion({
          childWorkflowRunId: 'child-a',
          finalExecution: makeFinalExec('child-a'),
          spaceId,
          workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
          workflowTaskManager: tm as unknown as WorkflowTaskManager,
          logger: logger as unknown as Logger,
        }),
        tryWakeParentResumeTaskAfterSyncChildCompletion({
          childWorkflowRunId: 'child-b',
          finalExecution: makeFinalExec('child-b'),
          spaceId,
          workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
          workflowTaskManager: tm as unknown as WorkflowTaskManager,
          logger: logger as unknown as Logger,
        }),
      ])
    ).resolves.toBeDefined();

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('conflict'));
  });

  it('parent fetch throws — logs warn and does not rethrow', async () => {
    const repo = makeRepo();
    const tm = makeTaskManager();
    const logger = makeLogger();

    repo.getWorkflowExecutionById.mockRejectedValue(new Error('cluster_block_exception'));

    await expect(
      tryWakeParentResumeTaskAfterSyncChildCompletion({
        childWorkflowRunId: childId,
        finalExecution: {
          id: childId,
          status: ExecutionStatus.COMPLETED,
          context: {
            parentWorkflowInvocation: 'sync',
            parentWorkflowExecutionId: parentId,
          },
        } as any,
        spaceId,
        workflowExecutionRepository: repo as unknown as WorkflowExecutionRepository,
        workflowTaskManager: tm as unknown as WorkflowTaskManager,
        logger: logger as unknown as Logger,
      })
    ).resolves.toBeUndefined();

    expect(tm.runTaskSoon).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster_block_exception'));
  });
});
