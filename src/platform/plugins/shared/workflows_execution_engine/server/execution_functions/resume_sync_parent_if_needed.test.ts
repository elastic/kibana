/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock, Mocked, MockedFunction } from 'vitest';

import type { Logger } from '@kbn/core/server';
import { type EsWorkflowExecution, ExecutionStatus } from '@kbn/workflows';
import { resumeSyncParentIfNeeded } from './resume_sync_parent_if_needed';
import { markExecutionFailedTaskRecovery, TASK_RECOVERY_ERROR_TYPE } from '../lib/task_recovery';
import type { StepExecutionRepository } from '../repositories/step_execution_repository';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';
import type { WorkflowTaskManager } from '../workflow_task_manager/workflow_task_manager';

vi.mock('../lib/task_recovery', async () => {
  const actual = (await vi.importActual('../lib/task_recovery'));
  return {
    ...actual,
    markExecutionFailedTaskRecovery: vi.fn().mockResolvedValue(undefined),
  };
});

const mockMarkFailed = markExecutionFailedTaskRecovery as MockedFunction<
  typeof markExecutionFailedTaskRecovery
>;

describe('resumeSyncParentIfNeeded', () => {
  const parentExecId = 'parent-execution-id';
  const childExecId = 'child-execution-id';
  const spaceId = 'default';
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger;

  const createChild = (overrides: Partial<EsWorkflowExecution> = {}): EsWorkflowExecution =>
    ({
      id: childExecId,
      spaceId,
      status: ExecutionStatus.COMPLETED,
      context: {
        parentWorkflowInvocation: 'sync',
        parentWorkflowExecutionId: parentExecId,
      },
      ...overrides,
    } as EsWorkflowExecution);

  const createDeps = () => {
    const internalResumeWorkflowExecution = vi.fn().mockResolvedValue(undefined);
    const workflowExecutionRepository = {
      getWorkflowExecutionById: vi.fn().mockResolvedValue({
        id: parentExecId,
        status: ExecutionStatus.WAITING_FOR_CHILD,
      }),
    } as unknown as Mocked<WorkflowExecutionRepository>;
    const stepExecutionRepository = {} as unknown as Mocked<StepExecutionRepository>;
    const workflowTaskManager = {
      hasActiveTaskForExecution: vi.fn().mockResolvedValue(false),
      runExistingResumeTask: vi.fn().mockResolvedValue(undefined),
      scheduleAndRunImmediateResume: vi.fn().mockResolvedValue(undefined),
    } as unknown as Mocked<WorkflowTaskManager>;

    return {
      internalResumeWorkflowExecution,
      workflowExecutionRepository,
      stepExecutionRepository,
      workflowTaskManager,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(global, 'setTimeout').mockImplementation(((callback: () => void) => {
      callback();
      return 0;
    }) as typeof setTimeout);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resumes the parent without a request so it wakes its own pre-scheduled resume task', async () => {
    const { internalResumeWorkflowExecution, ...repos } = createDeps();

    await resumeSyncParentIfNeeded({
      childExecution: createChild(),
      spaceId,
      internalResumeWorkflowExecution,
      logger,
      ...repos,
    });

    expect(internalResumeWorkflowExecution).toHaveBeenCalledTimes(1);
    expect(internalResumeWorkflowExecution).toHaveBeenCalledWith(parentExecId, spaceId, undefined);
    expect(mockMarkFailed).not.toHaveBeenCalled();
  });

  it('does not resume the parent under a descendant identity when the child completes after a HITL approval', async () => {
    const { internalResumeWorkflowExecution, ...repos } = createDeps();

    await resumeSyncParentIfNeeded({
      childExecution: createChild(),
      spaceId,
      internalResumeWorkflowExecution,
      logger,
      ...repos,
    });

    const resumeArgs = internalResumeWorkflowExecution.mock.calls[0];
    expect(resumeArgs).toHaveLength(3);
    expect(resumeArgs[3]).toBeUndefined();
  });

  it('retries runSoon when the parent task does not exist yet, then succeeds', async () => {
    const { internalResumeWorkflowExecution, ...repos } = createDeps();
    internalResumeWorkflowExecution
      .mockRejectedValueOnce(new Error('Saved object [task/workflow-wake-parent] not found'))
      .mockRejectedValueOnce(new Error('Saved object [task/workflow-wake-parent] not found'))
      .mockResolvedValue(undefined);

    await resumeSyncParentIfNeeded({
      childExecution: createChild(),
      spaceId,
      internalResumeWorkflowExecution,
      logger,
      ...repos,
    });

    expect(internalResumeWorkflowExecution).toHaveBeenCalledTimes(3);
    expect(mockMarkFailed).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining(`scheduled resume for parent ${parentExecId}`)
    );
  });

  it('fail-closes the parent when wake-up keeps failing and no authenticated resume task exists', async () => {
    const { internalResumeWorkflowExecution, ...repos } = createDeps();
    internalResumeWorkflowExecution.mockRejectedValue(new Error('not found'));

    await resumeSyncParentIfNeeded({
      childExecution: createChild(),
      spaceId,
      internalResumeWorkflowExecution,
      logger,
      ...repos,
    });

    expect(internalResumeWorkflowExecution).toHaveBeenCalledTimes(8);
    expect(mockMarkFailed).toHaveBeenCalledWith(
      repos.workflowExecutionRepository,
      repos.stepExecutionRepository,
      parentExecId,
      expect.objectContaining({
        type: TASK_RECOVERY_ERROR_TYPE,
        message: expect.stringContaining('had no authenticated resume task to wake'),
      })
    );
    expect(repos.workflowTaskManager.scheduleAndRunImmediateResume).not.toHaveBeenCalled();
  });

  it('wakes the grandparent after fail-closing a parent that is itself a sync child', async () => {
    const grandparentExecId = 'grandparent-execution-id';
    const { internalResumeWorkflowExecution, workflowExecutionRepository, ...repos } = createDeps();
    internalResumeWorkflowExecution.mockImplementation(async (executionId: string) => {
      if (executionId === grandparentExecId) {
        return;
      }
      throw new Error('not found');
    });
    (workflowExecutionRepository.getWorkflowExecutionById as Mock).mockResolvedValue({
      id: parentExecId,
      status: ExecutionStatus.WAITING_FOR_CHILD,
      context: {
        parentWorkflowInvocation: 'sync',
        parentWorkflowExecutionId: grandparentExecId,
      },
    });

    await resumeSyncParentIfNeeded({
      childExecution: createChild(),
      spaceId,
      internalResumeWorkflowExecution,
      workflowExecutionRepository,
      logger,
      ...repos,
    });

    expect(mockMarkFailed).toHaveBeenCalledTimes(1);
    expect(mockMarkFailed).toHaveBeenCalledWith(
      workflowExecutionRepository,
      repos.stepExecutionRepository,
      parentExecId,
      expect.anything()
    );
    expect(internalResumeWorkflowExecution).toHaveBeenCalledWith(
      grandparentExecId,
      spaceId,
      undefined
    );
    expect(internalResumeWorkflowExecution.mock.calls[8]).toEqual([
      grandparentExecId,
      spaceId,
      undefined,
    ]);
  });

  it('wakes an existing parent resume task instead of failing when one is already armed', async () => {
    const { internalResumeWorkflowExecution, workflowTaskManager, ...repos } = createDeps();
    internalResumeWorkflowExecution.mockRejectedValue(new Error('not found'));
    (workflowTaskManager.hasActiveTaskForExecution as Mock).mockResolvedValue(true);

    await resumeSyncParentIfNeeded({
      childExecution: createChild(),
      spaceId,
      internalResumeWorkflowExecution,
      workflowTaskManager,
      logger,
      ...repos,
    });

    expect(workflowTaskManager.runExistingResumeTask).toHaveBeenCalledWith(parentExecId);
    expect(mockMarkFailed).not.toHaveBeenCalled();
  });

  it('retries ancestor cleanup when an earlier attempt already finalized the immediate parent', async () => {
    const deps = createDeps();
    deps.internalResumeWorkflowExecution.mockImplementation(async (id) => {
      if (id === parentExecId) throw new Error('Parent task is gone');
    });
    deps.workflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue(
      createChild({
        id: parentExecId,
        status: ExecutionStatus.FAILED,
        context: { parentWorkflowInvocation: 'sync', parentWorkflowExecutionId: 'grandparent' },
      })
    );
    await resumeSyncParentIfNeeded({
      childExecution: createChild(),
      spaceId,
      logger,
      ...deps,
      throwOnFailure: true,
    });
    expect(deps.internalResumeWorkflowExecution).toHaveBeenLastCalledWith(
      'grandparent',
      spaceId,
      undefined
    );
  });

  it('does not fail-close the parent when it is already running', async () => {
    const { internalResumeWorkflowExecution, workflowExecutionRepository, ...repos } = createDeps();
    internalResumeWorkflowExecution.mockRejectedValue(new Error('not found'));
    (workflowExecutionRepository.getWorkflowExecutionById as Mock).mockResolvedValue({
      id: parentExecId,
      status: ExecutionStatus.RUNNING,
    });

    await resumeSyncParentIfNeeded({
      childExecution: createChild(),
      spaceId,
      internalResumeWorkflowExecution,
      workflowExecutionRepository,
      logger,
      ...repos,
    });

    expect(mockMarkFailed).not.toHaveBeenCalled();
  });

  it('does not fail-close the parent when cancel has already been requested', async () => {
    const { internalResumeWorkflowExecution, workflowExecutionRepository, ...repos } = createDeps();
    internalResumeWorkflowExecution.mockRejectedValue(new Error('not found'));
    (workflowExecutionRepository.getWorkflowExecutionById as Mock).mockResolvedValue({
      id: parentExecId,
      status: ExecutionStatus.WAITING_FOR_CHILD,
      cancelRequested: true,
    });

    await resumeSyncParentIfNeeded({
      childExecution: createChild(),
      spaceId,
      internalResumeWorkflowExecution,
      workflowExecutionRepository,
      logger,
      ...repos,
    });

    expect(mockMarkFailed).not.toHaveBeenCalled();
  });

  it('does not resume a non-terminal child', async () => {
    const { internalResumeWorkflowExecution, ...repos } = createDeps();

    await resumeSyncParentIfNeeded({
      childExecution: createChild({ status: ExecutionStatus.RUNNING }),
      spaceId,
      internalResumeWorkflowExecution,
      logger,
      ...repos,
    });

    expect(internalResumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('does not resume an async parent invocation', async () => {
    const { internalResumeWorkflowExecution, ...repos } = createDeps();

    await resumeSyncParentIfNeeded({
      childExecution: createChild({
        context: {
          parentWorkflowInvocation: 'async',
          parentWorkflowExecutionId: parentExecId,
        },
      }),
      spaceId,
      internalResumeWorkflowExecution,
      logger,
      ...repos,
    });

    expect(internalResumeWorkflowExecution).not.toHaveBeenCalled();
  });

  it('does nothing when internalResumeWorkflowExecution is missing', async () => {
    const { workflowExecutionRepository, ...repos } = createDeps();

    await resumeSyncParentIfNeeded({
      childExecution: createChild(),
      spaceId,
      logger,
      workflowExecutionRepository,
      ...repos,
    });

    expect(mockMarkFailed).not.toHaveBeenCalled();
  });
});
