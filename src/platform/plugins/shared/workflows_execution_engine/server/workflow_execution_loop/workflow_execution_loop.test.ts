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

describe('workflowExecutionLoop', () => {
  const createParams = () => ({
    workflowRuntime: {
      saveState: jest.fn().mockResolvedValue(undefined),
      setWorkflowError: jest.fn(),
    },
    workflowExecutionState: {
      updateWorkflowExecution: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
    },
    workflowLogger: {
      flushEvents: jest.fn().mockResolvedValue(undefined),
    },
    taskAbortController: new AbortController(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(params.workflowRuntime.saveState).toHaveBeenCalled();
    expect(params.workflowExecutionState.flush).toHaveBeenCalled();
    expect(params.workflowLogger.flushEvents).toHaveBeenCalled();
  });

  it('sets workflow error when execution loop throws', async () => {
    const params = createParams();
    const testError = new Error('execution failed');

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { executionFlowLoop } = require('./execution_flow_loop');
    (executionFlowLoop as jest.Mock).mockRejectedValueOnce(testError);

    await workflowExecutionLoop(params as any);

    expect(params.workflowRuntime.setWorkflowError).toHaveBeenCalledWith(testError);
  });

  it('updates execution state when task abort is signaled during workflow execution', async () => {
    const params = createParams();
    const loopPromise = workflowExecutionLoop(params as any);
    params.taskAbortController.abort();
    await loopPromise;

    expect(params.workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        cancelRequested: true,
        status: ExecutionStatus.CANCELLED,
      })
    );
  });
});
