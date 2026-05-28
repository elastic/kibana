/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GraphNodeUnion } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import { createMockWorkflowExecutionDriver } from '../workflow_context_manager/mocks/workflow_execution_driver.mock';
import { catchError } from './catch_error';

const createParams = (error?: Error) => {
  const scopeStack = [
    {
      stepId: 'step-1',
      nestedScopes: [{ nodeId: 'scope-node', nodeType: 'atomic' }],
    },
  ];

  const workflowExecutionDriver = createMockWorkflowExecutionDriver({
    error: error ? ExecutionError.fromError(error) : undefined,
    currentStackFrames: scopeStack,
    currentNode: { id: 'current-node' } as GraphNodeUnion,
  });

  const stepRuntime = {
    stepExecutionExists: jest.fn(() => true),
    stepExecution: { status: 'running' },
    error: error ? ExecutionError.fromError(error) : undefined,
    failStep: jest.fn(),
    abortController: new AbortController(),
  };

  const stepErrorCatcher = {
    catchError: jest.fn(() => {
      workflowExecutionDriver.setMockError(undefined);
    }),
  };

  const params = {
    workflowExecutionDriver,
    workflowExecutionState: {
      getWorkflowExecution: jest.fn(),
      updateWorkflowExecution: jest.fn(),
    },
    stepExecutionRuntimeFactory: {
      createStepExecutionRuntime: jest
        .fn()
        .mockReturnValueOnce({
          stepExecutionExists: jest.fn(() => true),
          failStep: jest.fn(),
        })
        .mockReturnValueOnce({
          stepExecutionExists: jest.fn(() => true),
          failStep: jest.fn(),
          abortController: new AbortController(),
        }),
    },
    nodesFactory: {
      create: jest.fn(() => stepErrorCatcher),
    },
    workflowLogger: {
      logError: jest.fn(),
    },
  };

  return { params, stepRuntime, workflowExecutionDriver, stepErrorCatcher };
};

describe('catchError', () => {
  it('returns early when workflow has no active error', async () => {
    const { params, stepRuntime } = createParams(undefined);

    await catchError(params as any, stepRuntime as any);

    expect(stepRuntime.failStep).not.toHaveBeenCalled();
    expect(params.workflowExecutionDriver.stop).not.toHaveBeenCalled();
  });

  it('fails the step and delegates error handling to catcher nodes', async () => {
    const initialError = new Error('boom');
    const { params, stepRuntime, stepErrorCatcher, workflowExecutionDriver } =
      createParams(initialError);

    await catchError(params as any, stepRuntime as any);

    expect(workflowExecutionDriver.navigateToNode).toHaveBeenCalledWith('scope-node');
    expect(stepErrorCatcher.catchError).toHaveBeenCalledTimes(1);
    expect(workflowExecutionDriver.commitPendingNavigation).toHaveBeenCalled();
  });

  it('stores workflow error on the driver and logs when catchError itself throws', async () => {
    const initialError = new Error('boom');
    const { params, stepRuntime, workflowExecutionDriver } = createParams(initialError);
    params.nodesFactory.create = jest.fn(() => ({
      catchError: jest.fn(() => {
        throw new Error('handler failed');
      }),
    }));

    await catchError(params as any, stepRuntime as any);

    expect(workflowExecutionDriver.error).toBeDefined();
    expect(params.workflowLogger.logError).toHaveBeenCalledWith(
      expect.stringContaining('Error in catchError:')
    );
    expect(workflowExecutionDriver.stop).toHaveBeenCalled();
  });
});
