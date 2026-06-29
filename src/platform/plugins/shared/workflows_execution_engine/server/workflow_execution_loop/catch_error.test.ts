/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { GraphNodeUnion } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import { catchError } from './catch_error';
import { createMockWorkflowExecutionCursor } from '../workflow_context_manager/mocks/workflow_execution_cursor.mock';

const createParams = (error?: Error) => {
  const scopeStack = [
    {
      stepId: 'step-1',
      nestedScopes: [{ nodeId: 'scope-node', nodeType: 'atomic' }],
    },
  ];

  const workflowExecutionCursor = createMockWorkflowExecutionCursor({
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
      workflowExecutionCursor.setMockError(undefined);
    }),
  };

  const params = {
    workflowExecutionCursor,
    workflowRuntime: {
      getWorkflowExecution: jest.fn(() => ({ status: ExecutionStatus.RUNNING })),
    },
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

  return { params, stepRuntime, workflowExecutionCursor, stepErrorCatcher };
};

describe('catchError', () => {
  it('returns early when workflow is already TIMED_OUT', async () => {
    const initialError = new Error('timeout');
    const { params, stepRuntime, workflowExecutionCursor } = createParams(initialError);
    params.workflowRuntime.getWorkflowExecution = jest.fn(() => ({
      status: ExecutionStatus.TIMED_OUT,
    }));

    await catchError(params as any, stepRuntime as any);

    expect(workflowExecutionCursor.captureError).not.toHaveBeenCalled();
    expect(workflowExecutionCursor.navigateToNode).not.toHaveBeenCalled();
    expect(workflowExecutionCursor.commitPendingNavigation).not.toHaveBeenCalled();
    expect(workflowExecutionCursor.stop).not.toHaveBeenCalled();
  });

  it('returns early when workflow has no active error', async () => {
    const { params, stepRuntime } = createParams(undefined);

    await catchError(params as any, stepRuntime as any);

    expect(stepRuntime.failStep).not.toHaveBeenCalled();
    expect(params.workflowExecutionCursor.stop).not.toHaveBeenCalled();
  });

  it('fails the step and delegates error handling to catcher nodes', async () => {
    const initialError = new Error('boom');
    const { params, stepRuntime, stepErrorCatcher, workflowExecutionCursor } =
      createParams(initialError);

    await catchError(params as any, stepRuntime as any);

    expect(workflowExecutionCursor.navigateToNode).toHaveBeenCalledWith('scope-node');
    expect(stepErrorCatcher.catchError).toHaveBeenCalledTimes(1);
    expect(workflowExecutionCursor.commitPendingNavigation).toHaveBeenCalled();
  });

  it('uses exited stack for catcher and pre-exit stack for failed step context', async () => {
    const scopeStack = [
      {
        stepId: 'step-1',
        nestedScopes: [{ nodeId: 'scope-node', nodeType: 'atomic' }],
      },
    ];
    const workflowExecutionCursor = createMockWorkflowExecutionCursor({
      error: ExecutionError.fromError(new Error('boom')),
      currentStackFrames: scopeStack,
      currentNode: { id: 'current-node' } as GraphNodeUnion,
    });
    const stepRuntime = {
      stepExecutionExists: jest.fn(() => true),
      stepExecution: { status: 'running' },
      error: ExecutionError.fromError(new Error('boom')),
      failStep: jest.fn(),
      abortController: new AbortController(),
    };
    const stepErrorCatcher = { catchError: jest.fn() };
    const createStepExecutionRuntime = jest
      .fn()
      .mockReturnValueOnce({
        stepExecutionExists: jest.fn(() => true),
        failStep: jest.fn(),
      })
      .mockReturnValueOnce({
        stepExecutionExists: jest.fn(() => true),
        failStep: jest.fn(),
        abortController: new AbortController(),
      });
    const params = {
      workflowExecutionCursor,
      workflowRuntime: {
        getWorkflowExecution: jest.fn(() => ({ status: ExecutionStatus.RUNNING })),
      },
      workflowExecutionState: {
        getWorkflowExecution: jest.fn(),
        updateWorkflowExecution: jest.fn(),
      },
      stepExecutionRuntimeFactory: { createStepExecutionRuntime },
      nodesFactory: { create: jest.fn(() => stepErrorCatcher) },
      workflowLogger: { logError: jest.fn() },
    };

    await catchError(params as any, stepRuntime as any);

    expect(createStepExecutionRuntime).toHaveBeenNthCalledWith(1, {
      nodeId: 'scope-node',
      stackFrames: [],
    });
    expect(createStepExecutionRuntime).toHaveBeenNthCalledWith(2, {
      nodeId: 'current-node',
      stackFrames: scopeStack,
    });
  });

  it('stores workflow error on the driver and logs when catchError itself throws', async () => {
    const initialError = new Error('boom');
    const { params, stepRuntime, workflowExecutionCursor } = createParams(initialError);
    params.nodesFactory.create = jest.fn(() => ({
      catchError: jest.fn(() => {
        throw new Error('handler failed');
      }),
    }));

    await catchError(params as any, stepRuntime as any);

    expect(workflowExecutionCursor.error).toBeDefined();
    expect(params.workflowLogger.logError).toHaveBeenCalledWith(
      expect.stringContaining('Error in catchError:')
    );
    expect(workflowExecutionCursor.stop).toHaveBeenCalled();
  });
});
