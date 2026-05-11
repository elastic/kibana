/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { handleExecutionDelay } from './handle_execution_delay';
import type { WorkflowExecutionLoopParams } from './types';
import { TimeoutAbortedError } from '../utils';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';

jest.mock('../utils', () => {
  const actual = jest.requireActual('../utils');
  return {
    ...actual,
    abortableTimeout: jest.fn().mockResolvedValue(undefined),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { abortableTimeout } = require('../utils');

const makeParams = (): jest.Mocked<WorkflowExecutionLoopParams> =>
  ({
    workflowRuntime: {
      getWorkflowExecution: jest.fn().mockReturnValue({ id: 'exec-1' }),
    },
    workflowExecutionState: {
      updateWorkflowExecution: jest.fn(),
    },
    workflowTaskManager: {
      scheduleResumeTask: jest.fn().mockResolvedValue(undefined),
    },
    fakeRequest: {},
  } as unknown as jest.Mocked<WorkflowExecutionLoopParams>);

const makeStepRuntime = (
  overrides: Partial<StepExecutionRuntime> = {}
): jest.Mocked<StepExecutionRuntime> =>
  ({
    stepExecution: undefined,
    abortController: new AbortController(),
    ...overrides,
  } as unknown as jest.Mocked<StepExecutionRuntime>);

describe('handleExecutionDelay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WAITING_FOR_INPUT step', () => {
    it('should set workflow status to WAITING_FOR_INPUT', async () => {
      const params = makeParams();
      const stepRuntime = makeStepRuntime({
        stepExecution: { status: ExecutionStatus.WAITING_FOR_INPUT } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        status: ExecutionStatus.WAITING_FOR_INPUT,
      });
    });

    it('should not schedule any resume task', async () => {
      const params = makeParams();
      const stepRuntime = makeStepRuntime({
        stepExecution: { status: ExecutionStatus.WAITING_FOR_INPUT } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowTaskManager.scheduleResumeTask).not.toHaveBeenCalled();
    });
  });

  describe('non-waiting step (no-op)', () => {
    it('should not update workflow status when step has no execution', async () => {
      const params = makeParams();
      const stepRuntime = makeStepRuntime({ stepExecution: undefined });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
    });

    it('should not update workflow status when step is RUNNING', async () => {
      const params = makeParams();
      const stepRuntime = makeStepRuntime({
        stepExecution: { status: ExecutionStatus.RUNNING } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
    });
  });

  describe('WAITING step with resumeAt', () => {
    it('should return early when resumeAt is not a string', async () => {
      const params = makeParams();
      const stepRuntime = makeStepRuntime({
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt: 12345 },
        } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
    });

    it('should use abortableTimeout for short durations (< 5s)', async () => {
      const params = makeParams();
      const shortFuture = new Date(Date.now() + 2000).toISOString();
      const stepRuntime = makeStepRuntime({
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt: shortFuture },
        } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(abortableTimeout).toHaveBeenCalled();
      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        status: ExecutionStatus.WAITING,
      });
      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        status: ExecutionStatus.RUNNING,
      });
    });

    it('should set timeout to 0 when resumeAt is in the past', async () => {
      const params = makeParams();
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const stepRuntime = makeStepRuntime({
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt: pastDate },
        } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(abortableTimeout).toHaveBeenCalledWith(0, expect.any(Object));
    });

    it('should reset to RUNNING when TimeoutAbortedError occurs during short wait', async () => {
      const params = makeParams();
      const shortFuture = new Date(Date.now() + 2000).toISOString();
      const stepRuntime = makeStepRuntime({
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt: shortFuture },
        } as any,
      });

      (abortableTimeout as jest.Mock).mockRejectedValueOnce(new TimeoutAbortedError());

      await handleExecutionDelay(params, stepRuntime);

      expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
        status: ExecutionStatus.RUNNING,
      });
    });

    it('should rethrow non-TimeoutAbortedError errors', async () => {
      const params = makeParams();
      const shortFuture = new Date(Date.now() + 2000).toISOString();
      const stepRuntime = makeStepRuntime({
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt: shortFuture },
        } as any,
      });

      (abortableTimeout as jest.Mock).mockRejectedValueOnce(new Error('unexpected'));

      await expect(handleExecutionDelay(params, stepRuntime)).rejects.toThrow('unexpected');
    });

    it('should schedule resume task for long durations (>= 5s)', async () => {
      const params = makeParams();
      const longFuture = new Date(Date.now() + 10000).toISOString();
      const stepRuntime = makeStepRuntime({
        stepExecution: {
          status: ExecutionStatus.WAITING,
          state: { resumeAt: longFuture },
        } as any,
      });

      await handleExecutionDelay(params, stepRuntime);

      expect(abortableTimeout).not.toHaveBeenCalled();
      expect(params.workflowTaskManager.scheduleResumeTask).toHaveBeenCalledWith({
        workflowExecution: { id: 'exec-1' },
        resumeAt: expect.any(Date),
        fakeRequest: params.fakeRequest,
      });
    });
  });
});
