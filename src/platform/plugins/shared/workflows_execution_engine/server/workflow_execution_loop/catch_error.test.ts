/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { catchError } from './catch_error';

const createParams = (error?: Error) => {
  const workflowExecution = {
    error,
    currentNodeId: 'current-node',
    scopeStack: [
      {
        stepId: 'step-1',
        nestedScopes: [{ nodeId: 'scope-node', nodeType: 'atomic' }],
      },
    ],
  };
  const workflowExecutionState = {
    getWorkflowExecution: jest.fn(() => workflowExecution),
    updateWorkflowExecution: jest.fn((updates: Partial<typeof workflowExecution>) =>
      Object.assign(workflowExecution, updates)
    ),
  };

  const stepRuntime = {
    stepExecutionExists: jest.fn(() => true),
    stepExecution: { status: 'running' },
    failStep: jest.fn(),
    abortController: new AbortController(),
  };

  const stepErrorCatcher = {
    catchError: jest.fn(() => {
      workflowExecution.error = undefined;
    }),
  };

  const params = {
    workflowExecutionState,
    workflowRuntime: {
      navigateToNode: jest.fn(),
    },
    stepExecutionRuntimeFactory: {
      createStepExecutionRuntime: jest
        .fn()
        // runtime for handling scope node
        .mockReturnValueOnce({
          stepExecutionExists: jest.fn(() => true),
          failStep: jest.fn(),
        })
        // runtime for failed context
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

  return { params, stepRuntime, workflowExecutionState, workflowExecution, stepErrorCatcher };
};

describe('catchError', () => {
  it('returns early when workflow has no active error', async () => {
    const { params, stepRuntime, workflowExecutionState } = createParams(undefined);

    await catchError(params as any, stepRuntime as any);

    expect(stepRuntime.failStep).not.toHaveBeenCalled();
    expect(workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
  });

  it('fails the step and delegates error handling to catcher nodes', async () => {
    const initialError = new Error('boom');
    const { params, stepRuntime, stepErrorCatcher } = createParams(initialError);

    await catchError(params as any, stepRuntime as any);

    expect(stepRuntime.failStep).toHaveBeenCalledTimes(1);
    expect(params.workflowRuntime.navigateToNode).toHaveBeenCalledWith('scope-node');
    expect(stepErrorCatcher.catchError).toHaveBeenCalledTimes(1);
  });

  it('updates workflow error and logs when catchError itself throws', async () => {
    const initialError = new Error('boom');
    const { params, stepRuntime, workflowExecutionState } = createParams(initialError);
    params.workflowExecutionState.getWorkflowExecution = jest.fn(() => ({
      error: initialError,
      currentNodeId: undefined,
      scopeStack: [
        {
          stepId: 'step-1',
          nestedScopes: [{ nodeId: 'scope-node', nodeType: 'atomic' }],
        },
      ],
    })) as unknown as (typeof params.workflowExecutionState)['getWorkflowExecution'];

    await catchError(params as any, stepRuntime as any);

    expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
      })
    );
    expect(params.workflowLogger.logError).toHaveBeenCalledWith(
      expect.stringContaining('Error in catchError:')
    );
  });
});
