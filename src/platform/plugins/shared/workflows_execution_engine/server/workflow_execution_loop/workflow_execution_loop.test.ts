/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { ExecutionStatus } from '@kbn/workflows';
import { workflowExecutionLoop } from './workflow_execution_loop';
import { createMockWorkflowExecutionCursor } from '../workflow_context_manager/mocks/workflow_execution_cursor.mock';
import { WorkflowTaskManagerAbortError } from '../workflow_task_shutdown';

vi.mock('elastic-apm-node', () => ({
  __esModule: true,
  default: {
    startSpan: vi.fn(() => ({ end: vi.fn() })),
  },
}));

vi.mock('./execution_flow_loop', () => {
  const mocked = {
    executionFlowLoop: vi.fn().mockResolvedValue(undefined),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./persistence_loop', () => {
  const mocked = {
    persistenceLoop: vi.fn().mockResolvedValue(undefined),
    flushState: vi.fn().mockResolvedValue(undefined),
  };
  return { ...mocked, default: mocked };
});

describe('workflowExecutionLoop', () => {
  const createParams = () => ({
    workflowExecutionCursor: createMockWorkflowExecutionCursor(),
    workflowRuntime: {
      saveState: vi.fn().mockResolvedValue(undefined),
      setWorkflowError: vi.fn(),
      getWorkflowExecution: vi.fn().mockReturnValue({
        id: 'exec-1',
        status: ExecutionStatus.RUNNING,
      }),
    },
    workflowExecutionState: {
      updateWorkflowExecution: vi.fn(),
    },
    stepIoService: {
      flush: vi.fn().mockResolvedValue(undefined),
      // Workflow-end safety release added with the deferred-release pattern.
      releaseTransientlyRehydratedOutputs: vi.fn(),
    },
    workflowLogger: {
      flushEvents: vi.fn().mockResolvedValue(undefined),
      logWarn: vi.fn(),
    },
    signal: new AbortController().signal,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs execution and persistence loops and flushes state', async () => {
    const params = createParams();
    await workflowExecutionLoop(params as any);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { executionFlowLoop } = require('./execution_flow_loop');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { persistenceLoop, flushState } = require('./persistence_loop');

    expect(executionFlowLoop).toHaveBeenCalledWith(params);
    expect(persistenceLoop).toHaveBeenCalled();
    expect(flushState).toHaveBeenCalled();
    expect(params.workflowExecutionCursor.start).toHaveBeenCalled();
    expect(params.workflowRuntime.saveState).toHaveBeenCalled();
    expect(params.stepIoService.flush).toHaveBeenCalled();
    // Workflow-end cleanup for transient rehydrations (deferred-release pattern).
    expect(params.stepIoService.releaseTransientlyRehydratedOutputs).toHaveBeenCalled();
    expect(params.workflowLogger.flushEvents).toHaveBeenCalled();
  });

  it('sets workflow error when execution loop throws', async () => {
    const params = createParams();
    const testError = new Error('execution failed');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { executionFlowLoop } = require('./execution_flow_loop');
    (executionFlowLoop as Mock).mockRejectedValueOnce(testError);

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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    expect(params.stepIoService.flush).toHaveBeenCalled();
    expect(params.workflowLogger.flushEvents).toHaveBeenCalledWith({
      signal: params.signal,
    });
  });
});
