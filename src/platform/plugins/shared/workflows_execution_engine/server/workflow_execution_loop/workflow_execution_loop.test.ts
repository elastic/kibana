/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { workflowExecutionLoop } from './workflow_execution_loop';
import { publishWorkflowExecutionFinished } from '../topics/publish_workflow_execution_finished';
import { createMockWorkflowExecutionCursor } from '../workflow_context_manager/mocks/workflow_execution_cursor.mock';
import { WorkflowTaskManagerAbortError } from '../workflow_task_shutdown';

jest.mock('elastic-apm-node', () => ({
  __esModule: true,
  default: {
    startSpan: jest.fn(() => ({ end: jest.fn() })),
  },
}));

jest.mock('./execution_flow_loop', () => ({
  executionFlowLoop: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./persistence_loop', () => ({
  persistenceLoop: jest.fn().mockResolvedValue(undefined),
  flushState: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../topics/publish_workflow_execution_finished', () => ({
  publishWorkflowExecutionFinished: jest.fn().mockResolvedValue(undefined),
}));

describe('workflowExecutionLoop', () => {
  const createParams = () => ({
    workflowExecutionCursor: createMockWorkflowExecutionCursor(),
    workflowRuntime: {
      saveState: jest.fn().mockResolvedValue(undefined),
      setWorkflowError: jest.fn(),
      takeJustFinalizedTerminalState: jest.fn().mockReturnValue(false),
      getWorkflowExecution: jest.fn().mockReturnValue({
        id: 'exec-1',
        status: ExecutionStatus.RUNNING,
      }),
    },
    workflowExecutionState: {
      updateWorkflowExecution: jest.fn(),
      flushWorkflowAndSteps: jest.fn().mockResolvedValue(undefined),
    },
    stepIoService: {
      rehydrate: jest.fn().mockResolvedValue(undefined),
    },
    workflowLogger: {
      logWarn: jest.fn(),
    },
    eventQueue: {
      flush: jest.fn().mockResolvedValue(undefined),
    },
    signal: new AbortController().signal,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs execution and persistence loops and flushes state', async () => {
    const params = createParams();
    await workflowExecutionLoop(params as any);

    // eslint-disable-next-line @kbn/compat/typescript-no-var-requires
    const { executionFlowLoop } = require('./execution_flow_loop');
    // eslint-disable-next-line @kbn/compat/typescript-no-var-requires
    const { persistenceLoop, flushState } = require('./persistence_loop');

    expect(executionFlowLoop).toHaveBeenCalledWith(params);
    expect(persistenceLoop).toHaveBeenCalled();
    expect(flushState).toHaveBeenCalled();
    expect(params.workflowExecutionCursor.start).toHaveBeenCalled();
    expect(params.workflowRuntime.saveState).toHaveBeenCalled();
    expect(params.workflowExecutionState.flushWorkflowAndSteps).toHaveBeenCalled();
    expect(params.eventQueue.flush).toHaveBeenCalled();
    expect(publishWorkflowExecutionFinished).not.toHaveBeenCalled();
  });

  it('does not publish a waiting_for_input save', async () => {
    const params = createParams();
    params.workflowRuntime.getWorkflowExecution.mockReturnValue({
      id: 'exec-1',
      workflowId: 'wf-1',
      spaceId: 'default',
      status: ExecutionStatus.WAITING_FOR_INPUT,
      isTestRun: false,
    });

    await workflowExecutionLoop(params as any);

    expect(publishWorkflowExecutionFinished).not.toHaveBeenCalled();
  });

  it.each([
    ExecutionStatus.COMPLETED,
    ExecutionStatus.FAILED,
    ExecutionStatus.CANCELLED,
    ExecutionStatus.TIMED_OUT,
  ])('publishes %s once after the final flush', async (status) => {
    const params = createParams();
    params.workflowRuntime.takeJustFinalizedTerminalState.mockReturnValue(true);
    params.workflowRuntime.getWorkflowExecution.mockReturnValue({
      id: 'exec-1',
      workflowId: 'wf-1',
      spaceId: 'default',
      status,
      finishedAt: '2026-01-01T00:00:00.000Z',
      isTestRun: false,
      duration: 1500,
      triggeredBy: 'manual',
      error: status === ExecutionStatus.FAILED ? { type: 'Error', message: 'boom' } : null,
    });

    await workflowExecutionLoop(params as any);

    expect(params.workflowExecutionState.flushWorkflowAndSteps).toHaveBeenCalled();
    expect(publishWorkflowExecutionFinished).toHaveBeenCalledTimes(1);
    expect(publishWorkflowExecutionFinished).toHaveBeenCalledWith({
      executionId: 'exec-1',
      workflowId: 'wf-1',
      spaceId: 'default',
      status,
      finishedAt: '2026-01-01T00:00:00.000Z',
      isTestRun: false,
      triggeredBy: 'manual',
      durationMs: 1500,
      ...(status === ExecutionStatus.FAILED ? { errorType: 'Error' } : {}),
    });
    expect(
      params.workflowExecutionState.flushWorkflowAndSteps.mock.invocationCallOrder[0]
    ).toBeLessThan(jest.mocked(publishWorkflowExecutionFinished).mock.invocationCallOrder[0]);
  });

  it('does not publish when a second flush follows an already-finalized run', async () => {
    const params = createParams();
    params.workflowRuntime.takeJustFinalizedTerminalState
      .mockReturnValueOnce(true)
      .mockReturnValue(false);
    params.workflowRuntime.getWorkflowExecution.mockReturnValue({
      id: 'exec-1',
      workflowId: 'wf-1',
      spaceId: 'default',
      status: ExecutionStatus.COMPLETED,
      finishedAt: '2026-01-01T00:00:00.000Z',
      isTestRun: false,
      duration: 1500,
      error: null,
    });

    await workflowExecutionLoop(params as any);
    await workflowExecutionLoop(params as any);

    expect(params.workflowExecutionState.flushWorkflowAndSteps).toHaveBeenCalledTimes(2);
    expect(publishWorkflowExecutionFinished).toHaveBeenCalledTimes(1);
    expect(publishWorkflowExecutionFinished).toHaveBeenCalledWith({
      executionId: 'exec-1',
      workflowId: 'wf-1',
      spaceId: 'default',
      status: ExecutionStatus.COMPLETED,
      finishedAt: '2026-01-01T00:00:00.000Z',
      isTestRun: false,
      durationMs: 1500,
    });
  });

  it('sets workflow error when execution loop throws', async () => {
    const params = createParams();
    const testError = new Error('execution failed');

    // eslint-disable-next-line @kbn/compat/typescript-no-var-requires
    const { executionFlowLoop } = require('./execution_flow_loop');
    (executionFlowLoop as jest.Mock).mockRejectedValueOnce(testError);

    await workflowExecutionLoop(params as any);

    expect(params.workflowExecutionCursor.error).toEqual(
      expect.objectContaining({ message: 'execution failed' })
    );
  });

  it('updates execution state when task abort is signaled during workflow execution', async () => {
    const params = createParams();
    const abortController = new AbortController();
    const loopPromise = workflowExecutionLoop({ ...params, signal: abortController.signal } as any);
    abortController.abort();
    await loopPromise;

    expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        cancelRequested: true,
        status: ExecutionStatus.CANCELLED,
      })
    );
    expect(params.workflowExecutionCursor.stop).toHaveBeenCalled();
  });

  it('marks Task Manager abort as system cancellation and suppresses workflow log errors', async () => {
    const params = createParams();
    const abortController = new AbortController();
    // eslint-disable-next-line @kbn/compat/typescript-no-var-requires
    const { flushState } = require('./persistence_loop');
    const loopPromise = workflowExecutionLoop({ ...params, signal: abortController.signal } as any);
    abortController.abort(new WorkflowTaskManagerAbortError());
    await loopPromise;

    expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        cancelRequested: true,
        status: ExecutionStatus.CANCELLED,
        cancellationReason: 'Cancelled because Task Manager aborted the task',
        cancelledBy: 'system',
      })
    );
    expect(flushState).toHaveBeenCalledWith(params, {
      workflowLogFlushSignal: params.signal,
    });
    expect(params.workflowRuntime.saveState).toHaveBeenCalled();
    expect(params.workflowExecutionState.flushWorkflowAndSteps).toHaveBeenCalled();
    expect(params.eventQueue.flush).toHaveBeenCalledWith({
      signal: params.signal,
    });
  });
});
