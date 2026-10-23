/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import {
  WorkflowExecutionInvalidStatusError,
  WorkflowExecutionNotFoundError,
  WorkflowResumeNotAppliedError,
} from '@kbn/workflows/common/errors';
import { resumeWaitingWorkflowExecution } from './resume_waiting_workflow_execution';

const executionId = 'exec-1';
const spaceId = 'default';
const input = { approved: false };
const previousContext = { inputs: { host: 'host-1' }, resumeInput: null };

const waitingExecution = (overrides: Partial<EsWorkflowExecution> = {}): EsWorkflowExecution =>
  ({
    id: executionId,
    spaceId,
    status: ExecutionStatus.WAITING_FOR_INPUT,
    context: previousContext,
    ...overrides,
  } as EsWorkflowExecution);

const createDeps = () => ({
  workflowExecutionRepository: {
    getWorkflowExecutionById: jest.fn().mockResolvedValue(waitingExecution()),
    updateWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    tryRevertResumeContext: jest.fn().mockResolvedValue('reverted'),
  },
  workflowTaskManager: { isResumeInProgress: jest.fn().mockResolvedValue(false) },
  internalResumeWorkflowExecution: jest.fn().mockResolvedValue(undefined),
  assertLicensed: jest.fn().mockResolvedValue(undefined),
  resolveResumedBy: jest.fn().mockResolvedValue('analyst'),
  logger: loggingSystemMock.createLogger(),
  retryDelaysMs: [100, 400],
  retryBudgetMs: 5_000,
  sleep: jest.fn().mockResolvedValue(undefined),
});

describe('resumeWaitingWorkflowExecution', () => {
  const request = httpServerMock.createKibanaRequest();
  const handOffError = new Error('the API key could not be granted');
  let deps: ReturnType<typeof createDeps>;

  const resume = (overrides: { resumedBy?: string } = {}) =>
    resumeWaitingWorkflowExecution(deps, { executionId, spaceId, input, request, ...overrides });
  const resumeError = (): Promise<unknown> =>
    resume().then(
      () => {
        throw new Error('expected the resume to fail');
      },
      (error: unknown) => error
    );
  const writtenResumedAt = (): string =>
    deps.workflowExecutionRepository.updateWorkflowExecution.mock.calls[0][0].context.resumedAt;

  beforeEach(() => {
    deps = createDeps();
  });

  describe('with a request', () => {
    it('stores the response and hands it to Task Manager', async () => {
      await expect(resume()).resolves.toEqual({ resumedBy: 'analyst' });

      expect(deps.resolveResumedBy).toHaveBeenCalledWith(request);
      expect(deps.workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledWith({
        id: executionId,
        context: {
          ...previousContext,
          resumeInput: input,
          resumedBy: 'analyst',
          resumedAt: expect.any(String),
          pendingInteractiveResume: true,
        },
      });
      expect(deps.internalResumeWorkflowExecution).toHaveBeenCalledWith(
        executionId,
        spaceId,
        undefined,
        request,
        { isUserInteractive: true }
      );
      expect(deps.workflowExecutionRepository.tryRevertResumeContext).not.toHaveBeenCalled();
    });

    it('records the given responder instead of resolving one', async () => {
      await expect(resume({ resumedBy: 'external_resume:step-1' })).resolves.toEqual({
        resumedBy: 'external_resume:step-1',
      });

      expect(deps.resolveResumedBy).not.toHaveBeenCalled();
    });

    it.each([
      ['the execution does not exist', null, WorkflowExecutionNotFoundError],
      [
        'the execution is not waiting for input',
        waitingExecution({ status: ExecutionStatus.RUNNING }),
        WorkflowExecutionInvalidStatusError,
      ],
      [
        'the execution already finished',
        waitingExecution({ finishedAt: '2026-10-20T00:00:00.000Z' }),
        WorkflowExecutionInvalidStatusError,
      ],
    ])('rejects without writing when %s', async (_, execution, errorClass) => {
      deps.workflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue(execution);

      await expect(resume()).rejects.toBeInstanceOf(errorClass);

      expect(deps.workflowExecutionRepository.updateWorkflowExecution).not.toHaveBeenCalled();
      expect(deps.internalResumeWorkflowExecution).not.toHaveBeenCalled();
    });

    it.each([
      ['the license check', (failure: Error) => deps.assertLicensed.mockRejectedValue(failure)],
      [
        'the execution read',
        (failure: Error) =>
          deps.workflowExecutionRepository.getWorkflowExecutionById.mockRejectedValue(failure),
      ],
    ])('reports %s failing as not applied, without writing', async (_, fail) => {
      const failure = new Error('unavailable');
      fail(failure);

      const error = await resumeError();

      expect(error).toBeInstanceOf(WorkflowResumeNotAppliedError);
      expect((error as WorkflowResumeNotAppliedError).cause).toBe(failure);
      expect(deps.workflowExecutionRepository.updateWorkflowExecution).not.toHaveBeenCalled();
    });

    it('retries a failed handoff', async () => {
      deps.internalResumeWorkflowExecution.mockRejectedValueOnce(handOffError);

      await expect(resume()).resolves.toEqual({ resumedBy: 'analyst' });

      expect(deps.internalResumeWorkflowExecution).toHaveBeenCalledTimes(2);
      expect(deps.sleep).toHaveBeenCalledTimes(1);
      const [[delayMs]] = deps.sleep.mock.calls;
      expect(delayMs).toBeGreaterThanOrEqual(50);
      expect(delayMs).toBeLessThanOrEqual(100);
      expect(deps.workflowTaskManager.isResumeInProgress).not.toHaveBeenCalled();
      expect(deps.workflowExecutionRepository.tryRevertResumeContext).not.toHaveBeenCalled();
    });

    it('stops retrying once the budget is spent', async () => {
      deps.retryBudgetMs = 0;
      deps.internalResumeWorkflowExecution.mockRejectedValue(handOffError);

      await expect(resume()).rejects.toBeInstanceOf(WorkflowResumeNotAppliedError);

      expect(deps.internalResumeWorkflowExecution).toHaveBeenCalledTimes(1);
      expect(deps.sleep).not.toHaveBeenCalled();
    });

    describe('when every handoff attempt fails', () => {
      beforeEach(() => {
        deps.internalResumeWorkflowExecution.mockRejectedValue(handOffError);
      });

      it('reverts the response it wrote and rejects as not applied', async () => {
        const error = await resumeError();

        expect(error).toBeInstanceOf(WorkflowResumeNotAppliedError);
        expect((error as WorkflowResumeNotAppliedError).cause).toBe(handOffError);
        expect(deps.internalResumeWorkflowExecution).toHaveBeenCalledTimes(3);
        expect(deps.workflowExecutionRepository.tryRevertResumeContext).toHaveBeenCalledWith({
          workflowExecutionId: executionId,
          spaceId,
          resumedBy: 'analyst',
          resumedAt: writtenResumedAt(),
          previousContext,
        });
      });

      it.each(['not_pending', 'not_found'] as const)(
        'rejects as not applied when the revert finds the response %s',
        async (result) => {
          deps.workflowExecutionRepository.tryRevertResumeContext.mockResolvedValue(result);

          await expect(resume()).rejects.toBeInstanceOf(WorkflowResumeNotAppliedError);
        }
      );

      it.each(['consumed', 'in_flight'] as const)(
        'reports success when the revert finds the response %s',
        async (result) => {
          deps.workflowExecutionRepository.tryRevertResumeContext.mockResolvedValue(result);

          await expect(resume()).resolves.toEqual({ resumedBy: 'analyst' });
        }
      );

      it('reports success without reverting when a resume is already in progress', async () => {
        deps.workflowTaskManager.isResumeInProgress.mockResolvedValue(true);

        await expect(resume()).resolves.toEqual({ resumedBy: 'analyst' });

        expect(deps.workflowTaskManager.isResumeInProgress).toHaveBeenCalledWith(executionId);
        expect(deps.workflowExecutionRepository.tryRevertResumeContext).not.toHaveBeenCalled();
      });

      it('keeps the handoff error without reverting when the in-progress check fails', async () => {
        deps.workflowTaskManager.isResumeInProgress.mockRejectedValue(new Error('unreadable'));

        await expect(resume()).rejects.toBe(handOffError);

        expect(deps.workflowExecutionRepository.tryRevertResumeContext).not.toHaveBeenCalled();
      });

      it('keeps the handoff error when the response cannot be reverted', async () => {
        deps.workflowExecutionRepository.tryRevertResumeContext.mockResolvedValue('conflict');

        await expect(resume()).rejects.toBe(handOffError);
      });

      it('keeps the handoff error when the revert fails', async () => {
        deps.workflowExecutionRepository.tryRevertResumeContext.mockRejectedValue(
          new Error('cluster unavailable')
        );

        await expect(resume()).rejects.toBe(handOffError);
      });
    });

    it('reverts without handing off when the context write fails', async () => {
      const writeError = new Error('request timed out');
      deps.workflowExecutionRepository.updateWorkflowExecution.mockRejectedValue(writeError);
      deps.workflowExecutionRepository.tryRevertResumeContext.mockResolvedValue('not_pending');

      const error = await resumeError();

      expect(error).toBeInstanceOf(WorkflowResumeNotAppliedError);
      expect((error as WorkflowResumeNotAppliedError).cause).toBe(writeError);
      expect(deps.internalResumeWorkflowExecution).not.toHaveBeenCalled();
      expect(deps.workflowTaskManager.isResumeInProgress).not.toHaveBeenCalled();
      expect(deps.workflowExecutionRepository.tryRevertResumeContext).toHaveBeenCalled();
    });
  });

  describe('without a request', () => {
    const resumeExternally = () =>
      resumeWaitingWorkflowExecution(deps, {
        executionId,
        spaceId,
        input,
        resumedBy: 'external_resume:step-1',
      });

    it('stores the response and hands it off in one call, as before', async () => {
      await expect(resumeExternally()).resolves.toEqual({ resumedBy: 'external_resume:step-1' });

      expect(deps.internalResumeWorkflowExecution).toHaveBeenCalledWith(
        executionId,
        spaceId,
        {
          ...previousContext,
          resumeInput: input,
          resumedBy: 'external_resume:step-1',
          resumedAt: expect.any(String),
          pendingInteractiveResume: false,
        },
        undefined,
        { isUserInteractive: true }
      );
      expect(deps.workflowExecutionRepository.updateWorkflowExecution).not.toHaveBeenCalled();
    });

    it('neither retries nor reverts a failed handoff', async () => {
      deps.internalResumeWorkflowExecution.mockRejectedValue(handOffError);

      await expect(resumeExternally()).rejects.toBe(handOffError);

      expect(deps.internalResumeWorkflowExecution).toHaveBeenCalledTimes(1);
      expect(deps.workflowExecutionRepository.tryRevertResumeContext).not.toHaveBeenCalled();
    });

    it('does not wrap a failure before the write', async () => {
      const failure = new Error('license inactive');
      deps.assertLicensed.mockRejectedValue(failure);

      await expect(resumeExternally()).rejects.toBe(failure);
    });
  });
});
