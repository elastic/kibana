/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import {
  buildTaskAttemptsExhaustedMessage,
  resolveExhaustedWorkflowRunTask,
  resolveInterruptedWorkflowResumeTask,
  resolveInterruptedWorkflowRunTask,
  shouldFailOnWorkflowRunRetry,
  TASK_RECOVERY_ERROR_TYPE,
  taskRecoveryMessages,
} from './task_recovery';
import type { WorkflowExecutionsDataClient } from '../repositories/data_access_layer';
import {
  createMockGetExecutionsByIdsResponse,
  createMockStepDataClient,
  createMockWorkflowDataClient,
} from '../repositories/data_access_layer/mocks';

import { StepExecutionRepository } from '../repositories/step_execution_repository';
import { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

const createRecoveryTestHarness = () => {
  const workflowExecutionsDataClient = createMockWorkflowDataClient();
  const stepExecutionsDataClient = createMockStepDataClient();
  const repository = new WorkflowExecutionRepository(workflowExecutionsDataClient);
  const stepExecutionRepository = new StepExecutionRepository(stepExecutionsDataClient);
  jest.spyOn(stepExecutionRepository, 'markNonTerminalStepsFailed').mockResolvedValue(undefined);
  return { workflowExecutionsDataClient, repository, stepExecutionRepository };
};

const mockExecutionLookup = (
  workflowExecutionsDataClient: jest.Mocked<WorkflowExecutionsDataClient>,
  execution: EsWorkflowExecution | null
) => {
  workflowExecutionsDataClient.getByIds.mockResolvedValue(
    createMockGetExecutionsByIdsResponse(execution ? [execution] : [])
  );
};

const expectFailedWorkflowUpdate = (
  workflowExecutionsDataClient: jest.Mocked<WorkflowExecutionsDataClient>,
  id: string,
  error: { type: string; message: string }
) => {
  expect(workflowExecutionsDataClient.bulk).toHaveBeenCalledWith(
    expect.objectContaining({
      items: [
        expect.objectContaining({
          operation: 'update',
          document: expect.objectContaining({
            id,
            status: ExecutionStatus.FAILED,
            error,
            finishedAt: expect.any(String),
          }),
        }),
      ],
    })
  );
};

describe('shouldFailOnWorkflowRunRetry', () => {
  const base = (status: ExecutionStatus): EsWorkflowExecution =>
    ({
      id: 'e1',
      spaceId: 'default',
      workflowId: 'w1',
      status,
    } as EsWorkflowExecution);

  it('returns false when terminal', () => {
    expect(shouldFailOnWorkflowRunRetry(base(ExecutionStatus.FAILED))).toBe(false);
    expect(shouldFailOnWorkflowRunRetry(base(ExecutionStatus.COMPLETED))).toBe(false);
  });

  it('returns false for waiting_for_input', () => {
    expect(shouldFailOnWorkflowRunRetry(base(ExecutionStatus.WAITING_FOR_INPUT))).toBe(false);
  });

  it('returns false for queued concurrency backlog', () => {
    expect(shouldFailOnWorkflowRunRetry(base(ExecutionStatus.QUEUED))).toBe(false);
  });

  it('returns true for running', () => {
    expect(shouldFailOnWorkflowRunRetry(base(ExecutionStatus.RUNNING))).toBe(true);
  });

  it('returns true for other non-terminal in-progress statuses (e.g. pending, waiting)', () => {
    expect(shouldFailOnWorkflowRunRetry(base(ExecutionStatus.PENDING))).toBe(true);
    expect(shouldFailOnWorkflowRunRetry(base(ExecutionStatus.WAITING))).toBe(true);
  });
});

describe('resolveInterruptedWorkflowRunTask', () => {
  let workflowExecutionsDataClient: jest.Mocked<WorkflowExecutionsDataClient>;
  let repository: WorkflowExecutionRepository;
  let stepExecutionRepository: StepExecutionRepository;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    ({ workflowExecutionsDataClient, repository, stepExecutionRepository } =
      createRecoveryTestHarness());
  });

  it('returns run_workflow when attempts is 1', async () => {
    await expect(
      resolveInterruptedWorkflowRunTask({
        workflowExecutionRepository: repository,
        stepExecutionRepository,
        workflowRunId: 'x',
        spaceId: 'default',
        taskAttempts: 1,
        logger,
      })
    ).resolves.toBe('run_workflow');
    expect(workflowExecutionsDataClient.getByIds).not.toHaveBeenCalled();
  });

  it('marks failed and completes task when retrying a running execution', async () => {
    mockExecutionLookup(workflowExecutionsDataClient, {
      id: 'x',
      spaceId: 'default',
      workflowId: 'w',
      status: ExecutionStatus.RUNNING,
    } as EsWorkflowExecution);

    await expect(
      resolveInterruptedWorkflowRunTask({
        workflowExecutionRepository: repository,
        stepExecutionRepository,
        workflowRunId: 'x',
        spaceId: 'default',
        taskAttempts: 2,
        logger,
      })
    ).resolves.toBe('task_complete');

    expectFailedWorkflowUpdate(workflowExecutionsDataClient, 'x', {
      type: TASK_RECOVERY_ERROR_TYPE,
      message: taskRecoveryMessages.workflowRunInterrupted,
    });
  });

  it('returns run_workflow when execution is missing on retry and logs a warning', async () => {
    mockExecutionLookup(workflowExecutionsDataClient, null);
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    await expect(
      resolveInterruptedWorkflowRunTask({
        workflowExecutionRepository: repository,
        stepExecutionRepository,
        workflowRunId: 'missing-id',
        spaceId: 'default',
        taskAttempts: 2,
        logger,
      })
    ).resolves.toBe('run_workflow');

    expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no execution document for missing-id')
    );
    warnSpy.mockRestore();
  });

  it('returns task_complete without update when execution is terminal on retry', async () => {
    mockExecutionLookup(workflowExecutionsDataClient, {
      id: 'x',
      spaceId: 'default',
      workflowId: 'w',
      status: ExecutionStatus.FAILED,
    } as EsWorkflowExecution);

    await expect(
      resolveInterruptedWorkflowRunTask({
        workflowExecutionRepository: repository,
        stepExecutionRepository,
        workflowRunId: 'x',
        spaceId: 'default',
        taskAttempts: 2,
        logger,
      })
    ).resolves.toBe('task_complete');

    expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
  });

  it('returns task_complete without update when execution is waiting_for_input on retry', async () => {
    mockExecutionLookup(workflowExecutionsDataClient, {
      id: 'x',
      spaceId: 'default',
      workflowId: 'w',
      status: ExecutionStatus.WAITING_FOR_INPUT,
    } as EsWorkflowExecution);
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    await expect(
      resolveInterruptedWorkflowRunTask({
        workflowExecutionRepository: repository,
        stepExecutionRepository,
        workflowRunId: 'x',
        spaceId: 'default',
        taskAttempts: 2,
        logger,
      })
    ).resolves.toBe('task_complete');

    expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('waiting_for_input'));
    warnSpy.mockRestore();
  });

  it('marks failed when retrying a pending execution (stuck before run advances state)', async () => {
    mockExecutionLookup(workflowExecutionsDataClient, {
      id: 'x',
      spaceId: 'default',
      workflowId: 'w',
      status: ExecutionStatus.PENDING,
    } as EsWorkflowExecution);

    await expect(
      resolveInterruptedWorkflowRunTask({
        workflowExecutionRepository: repository,
        stepExecutionRepository,
        workflowRunId: 'x',
        spaceId: 'default',
        taskAttempts: 2,
        logger,
      })
    ).resolves.toBe('task_complete');

    expect(workflowExecutionsDataClient.bulk).toHaveBeenCalled();
  });
});

describe('resolveInterruptedWorkflowResumeTask', () => {
  let workflowExecutionsDataClient: jest.Mocked<WorkflowExecutionsDataClient>;
  let repository: WorkflowExecutionRepository;
  let stepExecutionRepository: StepExecutionRepository;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    ({ workflowExecutionsDataClient, repository, stepExecutionRepository } =
      createRecoveryTestHarness());
  });

  it('returns resume_workflow when attempts is 1', async () => {
    await expect(
      resolveInterruptedWorkflowResumeTask({
        workflowExecutionRepository: repository,
        stepExecutionRepository,
        workflowRunId: 'x',
        spaceId: 'default',
        taskAttempts: 1,
        logger,
      })
    ).resolves.toBe('resume_workflow');
    expect(workflowExecutionsDataClient.getByIds).not.toHaveBeenCalled();
  });

  it('marks failed and completes task when retrying a running execution', async () => {
    mockExecutionLookup(workflowExecutionsDataClient, {
      id: 'x',
      spaceId: 'default',
      workflowId: 'w',
      status: ExecutionStatus.RUNNING,
    } as EsWorkflowExecution);

    await expect(
      resolveInterruptedWorkflowResumeTask({
        workflowExecutionRepository: repository,
        stepExecutionRepository,
        workflowRunId: 'x',
        spaceId: 'default',
        taskAttempts: 2,
        logger,
      })
    ).resolves.toBe('task_complete');

    expectFailedWorkflowUpdate(workflowExecutionsDataClient, 'x', {
      type: TASK_RECOVERY_ERROR_TYPE,
      message: taskRecoveryMessages.workflowResumeInterrupted,
    });
  });

  it('returns resume_workflow when execution is missing on retry and logs a warning', async () => {
    mockExecutionLookup(workflowExecutionsDataClient, null);
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    await expect(
      resolveInterruptedWorkflowResumeTask({
        workflowExecutionRepository: repository,
        stepExecutionRepository,
        workflowRunId: 'missing-id',
        spaceId: 'default',
        taskAttempts: 2,
        logger,
      })
    ).resolves.toBe('resume_workflow');

    expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('no execution document for missing-id')
    );
    warnSpy.mockRestore();
  });

  it('returns resume_workflow when still waiting_for_input so handler can retry', async () => {
    mockExecutionLookup(workflowExecutionsDataClient, {
      id: 'x',
      spaceId: 'default',
      workflowId: 'w',
      status: ExecutionStatus.WAITING_FOR_INPUT,
    } as EsWorkflowExecution);

    await expect(
      resolveInterruptedWorkflowResumeTask({
        workflowExecutionRepository: repository,
        stepExecutionRepository,
        workflowRunId: 'x',
        spaceId: 'default',
        taskAttempts: 2,
        logger,
      })
    ).resolves.toBe('resume_workflow');

    expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
  });

  it('returns task_complete when execution is already terminal', async () => {
    mockExecutionLookup(workflowExecutionsDataClient, {
      id: 'x',
      spaceId: 'default',
      workflowId: 'w',
      status: ExecutionStatus.COMPLETED,
    } as EsWorkflowExecution);

    await expect(
      resolveInterruptedWorkflowResumeTask({
        workflowExecutionRepository: repository,
        stepExecutionRepository,
        workflowRunId: 'x',
        spaceId: 'default',
        taskAttempts: 2,
        logger,
      })
    ).resolves.toBe('task_complete');

    expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
  });

  it('returns task_complete without update when execution is failed (terminal)', async () => {
    mockExecutionLookup(workflowExecutionsDataClient, {
      id: 'x',
      spaceId: 'default',
      workflowId: 'w',
      status: ExecutionStatus.FAILED,
    } as EsWorkflowExecution);

    await expect(
      resolveInterruptedWorkflowResumeTask({
        workflowExecutionRepository: repository,
        stepExecutionRepository,
        workflowRunId: 'x',
        spaceId: 'default',
        taskAttempts: 2,
        logger,
      })
    ).resolves.toBe('task_complete');

    expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
  });
});

describe('resolveExhaustedWorkflowRunTask', () => {
  let workflowExecutionsDataClient: jest.Mocked<WorkflowExecutionsDataClient>;
  let repository: WorkflowExecutionRepository;
  let stepExecutionRepository: StepExecutionRepository;
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    ({ workflowExecutionsDataClient, repository, stepExecutionRepository } =
      createRecoveryTestHarness());
    jest.spyOn(logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does nothing when taskAttempts is below maxAttempts', async () => {
    await resolveExhaustedWorkflowRunTask({
      workflowExecutionRepository: repository,
      stepExecutionRepository,
      workflowRunId: 'run-1',
      spaceId: 'default',
      taskAttempts: 2,
      maxAttempts: 3,
      error: new Error('ignored'),
      logger,
    });

    expect(workflowExecutionsDataClient.getByIds).not.toHaveBeenCalled();
    expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
  });

  it('marks FAILED with TaskAttemptsExhaustedError on last attempt when execution is non-terminal', async () => {
    mockExecutionLookup(workflowExecutionsDataClient, {
      id: 'run-1',
      spaceId: 'default',
      workflowId: 'w',
      status: ExecutionStatus.RUNNING,
    } as EsWorkflowExecution);

    const thrown = new Error('handler blew up');

    await resolveExhaustedWorkflowRunTask({
      workflowExecutionRepository: repository,
      stepExecutionRepository,
      workflowRunId: 'run-1',
      spaceId: 'default',
      taskAttempts: 3,
      maxAttempts: 3,
      error: thrown,
      logger,
    });

    expectFailedWorkflowUpdate(workflowExecutionsDataClient, 'run-1', {
      type: 'TaskAttemptsExhaustedError',
      message: buildTaskAttemptsExhaustedMessage(thrown.message),
    });
  });

  it('does not update when execution is already terminal on last attempt', async () => {
    mockExecutionLookup(workflowExecutionsDataClient, {
      id: 'run-1',
      spaceId: 'default',
      workflowId: 'w',
      status: ExecutionStatus.COMPLETED,
    } as EsWorkflowExecution);

    await resolveExhaustedWorkflowRunTask({
      workflowExecutionRepository: repository,
      stepExecutionRepository,
      workflowRunId: 'run-1',
      spaceId: 'default',
      taskAttempts: 3,
      maxAttempts: 3,
      error: new Error('handler blew up'),
      logger,
    });

    expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
  });

  it('does not update when execution document is missing on last attempt', async () => {
    mockExecutionLookup(workflowExecutionsDataClient, null);

    await resolveExhaustedWorkflowRunTask({
      workflowExecutionRepository: repository,
      stepExecutionRepository,
      workflowRunId: 'run-1',
      spaceId: 'default',
      taskAttempts: 3,
      maxAttempts: 3,
      error: new Error('handler blew up'),
      logger,
    });

    expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs error when getWorkflowExecutionById fails with a non-404 error on last attempt', async () => {
    workflowExecutionsDataClient.getByIds.mockRejectedValueOnce(new Error('Internal Server Error'));

    await resolveExhaustedWorkflowRunTask({
      workflowExecutionRepository: repository,
      stepExecutionRepository,
      workflowRunId: 'run-1',
      spaceId: 'default',
      taskAttempts: 3,
      maxAttempts: 3,
      error: new Error('handler blew up'),
      logger,
    });

    expect(workflowExecutionsDataClient.bulk).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to mark workflow execution run-1 as FAILED')
    );
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Internal Server Error'));
  });

  it('logs error when marking FAILED throws on last attempt', async () => {
    mockExecutionLookup(workflowExecutionsDataClient, {
      id: 'run-1',
      spaceId: 'default',
      workflowId: 'w',
      status: ExecutionStatus.RUNNING,
    } as EsWorkflowExecution);
    workflowExecutionsDataClient.bulk.mockRejectedValueOnce(new Error('update rejected'));

    await resolveExhaustedWorkflowRunTask({
      workflowExecutionRepository: repository,
      stepExecutionRepository,
      workflowRunId: 'run-1',
      spaceId: 'default',
      taskAttempts: 3,
      maxAttempts: 3,
      error: new Error('handler blew up'),
      logger,
    });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to mark workflow execution run-1 as FAILED')
    );
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('update rejected'));
  });
});
