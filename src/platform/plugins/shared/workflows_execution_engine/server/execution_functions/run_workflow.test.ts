/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ExecutionStatus } from '@kbn/workflows';
import { WORKFLOW_EXECUTION_FAILED_TRIGGER_ID } from '@kbn/workflows-extensions/server';
import { mockContextDependencies } from './__mock__/context_dependencies';
import { runWorkflow } from './run_workflow';
import { setupDependencies } from './setup_dependencies';
import { workflowExecutionLoop } from '../workflow_execution_loop';

jest.mock('./setup_dependencies');
jest.mock('../workflow_execution_loop');

const mockSetupDependencies = setupDependencies as jest.MockedFunction<typeof setupDependencies>;
const mockWorkflowExecutionLoop = workflowExecutionLoop as jest.MockedFunction<
  typeof workflowExecutionLoop
>;

describe('runWorkflow', () => {
  const workflowRunId = 'run-1';
  const spaceId = 'default';
  const logger = loggingSystemMock.create().get();
  const fakeRequest = { headers: {} } as KibanaRequest;
  let dependencies: ReturnType<typeof mockContextDependencies>;
  let mockGetWorkflowExecutionById: jest.Mock;
  let mockGetLastFailedStepContext: jest.Mock;
  let mockEmitEvent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    dependencies = mockContextDependencies();
    mockEmitEvent = jest.fn().mockResolvedValue(undefined);
    (dependencies as any).workflowsExtensions = {
      emitEvent: mockEmitEvent,
    };
    mockGetWorkflowExecutionById = jest.fn();
    mockGetLastFailedStepContext = jest.fn().mockReturnValue(undefined);

    mockSetupDependencies.mockResolvedValue({
      workflowRuntime: { start: jest.fn().mockResolvedValue(undefined) },
      stepExecutionRuntimeFactory: {},
      workflowExecutionState: { getLastFailedStepContext: mockGetLastFailedStepContext },
      workflowLogger: {},
      nodesFactory: {},
      workflowExecutionGraph: {},
      workflowTaskManager: {},
      workflowExecutionRepository: {
        getWorkflowExecutionById: mockGetWorkflowExecutionById,
      },
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
    } as any);
  });

  it('emits workflow_execution_failed event when execution fails and workflowsExtensions is provided', async () => {
    mockWorkflowExecutionLoop.mockRejectedValueOnce(new Error('Step failed'));

    const failedExecution = {
      id: workflowRunId,
      workflowId: 'wf-1',
      spaceId,
      status: ExecutionStatus.FAILED,
      isTestRun: false,
      workflowDefinition: { name: 'Test Workflow', steps: [] },
      error: { type: 'Error', message: 'Step failed' },
      createdAt: '2024-01-01T10:00:00.000Z',
      finishedAt: '2024-01-01T10:05:00.000Z',
      triggeredBy: 'manual',
    };
    mockGetWorkflowExecutionById.mockResolvedValue(failedExecution);
    mockGetLastFailedStepContext.mockReturnValue({
      stepId: 'step_1',
      stepName: 'HTTP request',
      stepExecutionId: 'se-1',
    });

    await expect(
      runWorkflow({
        workflowRunId,
        spaceId,
        taskAbortController: new AbortController(),
        logger: logger as Logger,
        config: { logging: { console: false }, http: { allowedHosts: ['*'] } } as any,
        fakeRequest,
        dependencies,
      })
    ).rejects.toThrow('Step failed');

    expect(mockGetWorkflowExecutionById).toHaveBeenCalledWith(workflowRunId, spaceId);
    expect(mockEmitEvent).toHaveBeenCalledTimes(1);
    expect(mockEmitEvent).toHaveBeenCalledWith({
      triggerId: WORKFLOW_EXECUTION_FAILED_TRIGGER_ID,
      spaceId,
      payload: expect.objectContaining({
        workflow: expect.objectContaining({
          id: 'wf-1',
          name: 'Test Workflow',
          spaceId: 'default',
          isErrorHandler: false,
        }),
        execution: expect.objectContaining({
          id: workflowRunId,
          startedAt: '2024-01-01T10:00:00.000Z',
          failedAt: '2024-01-01T10:05:00.000Z',
        }),
        error: expect.objectContaining({
          message: 'Step failed',
          stepId: 'step_1',
          stepName: 'HTTP request',
          stepExecutionId: 'se-1',
        }),
      }),
      request: fakeRequest,
    });
  });

  it('does not emit when execution status is not FAILED', async () => {
    mockWorkflowExecutionLoop.mockRejectedValueOnce(new Error('Step failed'));
    mockGetWorkflowExecutionById.mockResolvedValue({
      id: workflowRunId,
      status: ExecutionStatus.COMPLETED,
      isTestRun: false,
    });
    mockGetLastFailedStepContext.mockReturnValue(undefined);

    await expect(
      runWorkflow({
        workflowRunId,
        spaceId,
        taskAbortController: new AbortController(),
        logger: logger as Logger,
        config: { logging: { console: false }, http: { allowedHosts: ['*'] } } as any,
        fakeRequest,
        dependencies,
      })
    ).rejects.toThrow('Step failed');

    expect(mockEmitEvent).not.toHaveBeenCalled();
  });

  it('does not emit when execution is a test run', async () => {
    mockWorkflowExecutionLoop.mockRejectedValueOnce(new Error('Step failed'));
    mockGetWorkflowExecutionById.mockResolvedValue({
      id: workflowRunId,
      workflowId: 'wf-1',
      spaceId,
      status: ExecutionStatus.FAILED,
      isTestRun: true,
      workflowDefinition: { name: 'Test' },
      error: { message: 'Step failed' },
      createdAt: '2024-01-01T10:00:00.000Z',
      finishedAt: '2024-01-01T10:05:00.000Z',
      triggeredBy: 'manual',
    });

    await expect(
      runWorkflow({
        workflowRunId,
        spaceId,
        taskAbortController: new AbortController(),
        logger: logger as Logger,
        config: { logging: { console: false }, http: { allowedHosts: ['*'] } } as any,
        fakeRequest,
        dependencies,
      })
    ).rejects.toThrow('Step failed');

    expect(mockEmitEvent).not.toHaveBeenCalled();
  });

  it('does not call emitEvent when workflowsExtensions is not provided', async () => {
    mockWorkflowExecutionLoop.mockRejectedValueOnce(new Error('Step failed'));
    const depsWithoutExtensions = mockContextDependencies();
    delete (depsWithoutExtensions as any).workflowsExtensions;
    mockGetWorkflowExecutionById.mockResolvedValue({
      id: workflowRunId,
      workflowId: 'wf-1',
      spaceId,
      status: ExecutionStatus.FAILED,
      isTestRun: false,
      workflowDefinition: { name: 'Test' },
      error: { message: 'Step failed' },
      createdAt: '2024-01-01T10:00:00.000Z',
      finishedAt: '2024-01-01T10:05:00.000Z',
      triggeredBy: 'manual',
    });

    mockSetupDependencies.mockResolvedValue({
      workflowRuntime: { start: jest.fn().mockResolvedValue(undefined) },
      stepExecutionRuntimeFactory: {},
      workflowExecutionState: { getLastFailedStepContext: jest.fn().mockReturnValue(undefined) },
      workflowLogger: {},
      nodesFactory: {},
      workflowExecutionGraph: {},
      workflowTaskManager: {},
      workflowExecutionRepository: { getWorkflowExecutionById: mockGetWorkflowExecutionById },
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
    } as any);

    await expect(
      runWorkflow({
        workflowRunId,
        spaceId,
        taskAbortController: new AbortController(),
        logger: logger as Logger,
        config: { logging: { console: false }, http: { allowedHosts: ['*'] } } as any,
        fakeRequest,
        dependencies: depsWithoutExtensions,
      })
    ).rejects.toThrow('Step failed');

    expect(mockEmitEvent).not.toHaveBeenCalled();
  });
});
