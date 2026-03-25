/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import apm from 'elastic-apm-node';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ExecutionStatus } from '@kbn/workflows';
import { WORKFLOW_EXECUTION_FAILED_TRIGGER_ID } from '@kbn/workflows-extensions/server';

import { mockContextDependencies } from './__mock__/context_dependencies';
import {
  buildMockSetupDependenciesReturn,
  createFakeKibanaRequest,
  createMockLogger,
  createMockWorkflowExecutionEngineConfig,
  createMockWorkflowExecutionRepository,
  createMockWorkflowRuntime,
  getExpectedWorkflowExecutionLoopCallArgs,
} from './execution_functions_test_utils';
import { runWorkflow } from './run_workflow';
import { setupDependencies } from './setup_dependencies';
import type { WorkflowsMeteringService } from '../metering';
import { workflowExecutionLoop } from '../workflow_execution_loop';

jest.mock('./setup_dependencies');
jest.mock('../workflow_execution_loop', () => ({
  workflowExecutionLoop: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('elastic-apm-node', () => ({
  __esModule: true,
  default: {
    startSpan: jest.fn(),
  },
}));

const mockSetupDependencies = setupDependencies as jest.MockedFunction<typeof setupDependencies>;
const mockWorkflowExecutionLoop = workflowExecutionLoop as jest.MockedFunction<
  typeof workflowExecutionLoop
>;
const mockStartSpan = apm.startSpan as jest.Mock;

describe('runWorkflow', () => {
  describe('wiring / spans / metering', () => {
    const workflowRunId = 'test-workflow-run-id';
    const spaceId = 'default';

    const mockConfig = createMockWorkflowExecutionEngineConfig();

    let dependencies: ReturnType<typeof mockContextDependencies>;
    let fakeRequest: KibanaRequest;
    let logger: Logger;
    let taskAbortController: AbortController;
    let workflowRuntime: ReturnType<typeof createMockWorkflowRuntime>;
    let workflowExecutionRepository: ReturnType<typeof createMockWorkflowExecutionRepository>;
    const recordedSpans: Array<{ end: jest.Mock; setOutcome: jest.Mock }> = [];

    const runWorkflowWithDefaults = (overrides?: {
      meteringService?: WorkflowsMeteringService;
      isEventDrivenExecutionEnabled?: () => boolean;
    }) =>
      runWorkflow({
        workflowRunId,
        spaceId,
        taskAbortController,
        logger,
        config: mockConfig,
        fakeRequest,
        dependencies,
        meteringService: overrides?.meteringService,
        isEventDrivenExecutionEnabled: overrides?.isEventDrivenExecutionEnabled,
      });

    beforeEach(() => {
      jest.clearAllMocks();
      recordedSpans.length = 0;

      mockStartSpan.mockImplementation(() => {
        const span = { end: jest.fn(), setOutcome: jest.fn() };
        recordedSpans.push(span);
        return span;
      });

      dependencies = mockContextDependencies();
      fakeRequest = createFakeKibanaRequest();
      logger = createMockLogger();
      taskAbortController = new AbortController();

      workflowRuntime = createMockWorkflowRuntime();
      workflowExecutionRepository = createMockWorkflowExecutionRepository();

      mockSetupDependencies.mockResolvedValue(
        buildMockSetupDependenciesReturn({ workflowRuntime, workflowExecutionRepository })
      );

      mockWorkflowExecutionLoop.mockResolvedValue(undefined);
    });

    describe('happy path / wiring', () => {
      it('calls setupDependencies with all expected arguments', async () => {
        await runWorkflowWithDefaults();

        expect(mockSetupDependencies).toHaveBeenCalledWith(
          workflowRunId,
          spaceId,
          logger,
          mockConfig,
          dependencies,
          fakeRequest,
          undefined
        );
      });

      it('calls workflowRuntime.start then workflowExecutionLoop in order', async () => {
        await runWorkflowWithDefaults();

        expect(workflowRuntime.start).toHaveBeenCalledTimes(1);
        expect(mockWorkflowExecutionLoop).toHaveBeenCalledTimes(1);
        expect(workflowRuntime.start.mock.invocationCallOrder[0]).toBeLessThan(
          mockWorkflowExecutionLoop.mock.invocationCallOrder[0]!
        );
      });

      it('passes all setupDependencies outputs and context into workflowExecutionLoop', async () => {
        await runWorkflowWithDefaults();

        expect(mockWorkflowExecutionLoop).toHaveBeenCalledWith(
          getExpectedWorkflowExecutionLoopCallArgs({
            workflowRuntime,
            workflowExecutionRepository,
            dependencies,
            fakeRequest,
            taskAbortController,
          })
        );
      });
    });

    describe('elastic-apm-node spans', () => {
      it('ends setup, start, and loop spans; loop span outcome is success on full run', async () => {
        await runWorkflowWithDefaults();

        const [setupSpan, startSpan, loopSpan] = recordedSpans;
        expect(setupSpan!.end).toHaveBeenCalled();
        expect(startSpan!.end).toHaveBeenCalled();
        expect(loopSpan!.setOutcome).toHaveBeenCalledWith('success');
        expect(loopSpan!.end).toHaveBeenCalled();
      });

      it('ends only setup span when event-driven run is skipped before runtime start', async () => {
        workflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue({
          id: workflowRunId,
          workflowId: 'wf',
          spaceId,
          status: ExecutionStatus.RUNNING,
          triggeredBy: 'workflow-step',
        });

        await runWorkflowWithDefaults({
          isEventDrivenExecutionEnabled: () => false,
        });

        expect(recordedSpans).toHaveLength(1);
        expect(recordedSpans[0]!.end).toHaveBeenCalled();
      });

      it('ends setup and start spans when workflowRuntime.start throws', async () => {
        workflowRuntime.start.mockRejectedValue(new Error('start failed'));

        await expect(runWorkflowWithDefaults()).rejects.toThrow('start failed');

        const [setupSpan, startSpan] = recordedSpans;
        expect(setupSpan!.end).toHaveBeenCalled();
        expect(startSpan!.end).toHaveBeenCalled();
        expect(recordedSpans).toHaveLength(2);
      });

      it('sets loop span outcome to failure and ends loop span when workflowExecutionLoop rejects', async () => {
        mockWorkflowExecutionLoop.mockRejectedValue(new Error('loop failed'));

        await expect(runWorkflowWithDefaults()).rejects.toThrow('loop failed');

        const loopSpan = recordedSpans[2];
        expect(loopSpan!.setOutcome).toHaveBeenCalledWith('failure');
        expect(loopSpan!.end).toHaveBeenCalled();
      });
    });

    describe('event-driven execution gate', () => {
      const baseExecution = {
        id: workflowRunId,
        workflowId: 'wf',
        spaceId,
        status: ExecutionStatus.RUNNING,
      };

      it('does not call getWorkflowExecutionById when gate is omitted', async () => {
        await runWorkflowWithDefaults();

        expect(workflowExecutionRepository.getWorkflowExecutionById).not.toHaveBeenCalled();
      });

      it('when gate present and getWorkflowExecutionById returns null, continues without update', async () => {
        workflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue(null);

        await runWorkflowWithDefaults({
          isEventDrivenExecutionEnabled: () => true,
        });

        expect(workflowExecutionRepository.updateWorkflowExecution).not.toHaveBeenCalled();
        expect(workflowRuntime.start).toHaveBeenCalled();
        expect(mockWorkflowExecutionLoop).toHaveBeenCalled();
      });

      it('when gate present and triggeredBy is undefined, does not treat as event-driven', async () => {
        workflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue({
          ...baseExecution,
          triggeredBy: undefined,
        });

        await runWorkflowWithDefaults({
          isEventDrivenExecutionEnabled: () => false,
        });

        expect(workflowExecutionRepository.updateWorkflowExecution).not.toHaveBeenCalled();
        expect(workflowRuntime.start).toHaveBeenCalled();
      });

      it('when gate present and triggeredBy is null, does not treat as event-driven', async () => {
        workflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue({
          ...baseExecution,
          triggeredBy: null,
        });

        await runWorkflowWithDefaults({
          isEventDrivenExecutionEnabled: () => false,
        });

        expect(workflowExecutionRepository.updateWorkflowExecution).not.toHaveBeenCalled();
        expect(workflowRuntime.start).toHaveBeenCalled();
      });

      it('when gate present and built-in trigger manual, continues even if kill switch is false', async () => {
        workflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue({
          ...baseExecution,
          triggeredBy: 'manual',
        });

        await runWorkflowWithDefaults({
          isEventDrivenExecutionEnabled: () => false,
        });

        expect(workflowExecutionRepository.updateWorkflowExecution).not.toHaveBeenCalled();
        expect(workflowRuntime.start).toHaveBeenCalled();
        expect(mockWorkflowExecutionLoop).toHaveBeenCalled();
      });

      it('when event-driven trigger and kill switch disabled, skips and does not start or loop', async () => {
        workflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue({
          ...baseExecution,
          triggeredBy: 'workflow-step',
        });

        await runWorkflowWithDefaults({
          isEventDrivenExecutionEnabled: () => false,
        });

        expect(workflowExecutionRepository.updateWorkflowExecution).toHaveBeenCalledWith({
          id: workflowRunId,
          status: ExecutionStatus.SKIPPED,
          cancellationReason: 'Event-driven execution disabled by operator',
          cancelledAt: expect.any(String),
          cancelledBy: 'system',
        });
        expect(logger.debug).toHaveBeenCalledWith(
          expect.stringContaining(
            `Event-driven execution is disabled; skipping workflow run ${workflowRunId}`
          )
        );
        expect(workflowRuntime.start).not.toHaveBeenCalled();
        expect(mockWorkflowExecutionLoop).not.toHaveBeenCalled();
      });

      it('when event-driven trigger and kill switch enabled, full run proceeds', async () => {
        workflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue({
          ...baseExecution,
          triggeredBy: 'workflow-step',
        });

        await runWorkflowWithDefaults({
          isEventDrivenExecutionEnabled: () => true,
        });

        expect(workflowExecutionRepository.updateWorkflowExecution).not.toHaveBeenCalled();
        expect(workflowRuntime.start).toHaveBeenCalled();
        expect(mockWorkflowExecutionLoop).toHaveBeenCalled();
      });
    });

    describe('workflowRuntime.start() error handling', () => {
      it('logs error and stack for Error and rethrows', async () => {
        const err = new Error('start failed');
        workflowRuntime.start.mockRejectedValue(err);

        await expect(runWorkflowWithDefaults()).rejects.toThrow('start failed');

        expect(logger.error).toHaveBeenCalledWith(
          `Workflow execution ${workflowRunId} failed during runtime start: start failed`
        );
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining(`Workflow execution ${workflowRunId} runtime start error stack:`)
        );
      });

      it('logs stringified message without stack for non-Error and rethrows', async () => {
        workflowRuntime.start.mockRejectedValue('boom');

        await expect(runWorkflowWithDefaults()).rejects.toBe('boom');

        expect(logger.error).toHaveBeenCalledWith(
          `Workflow execution ${workflowRunId} failed during runtime start: boom`
        );
        const stackCalls = (logger.error as jest.Mock).mock.calls.filter((c: string[]) =>
          String(c[0]).includes('runtime start error stack')
        );
        expect(stackCalls).toHaveLength(0);
      });
    });

    describe('workflowExecutionLoop failure', () => {
      it('propagates error from workflowExecutionLoop', async () => {
        const loopError = new Error('loop failed');
        mockWorkflowExecutionLoop.mockRejectedValue(loopError);

        await expect(runWorkflowWithDefaults()).rejects.toThrow('loop failed');
      });
    });

    describe('metering', () => {
      const finalExecution = {
        id: workflowRunId,
        workflowId: 'wf',
        spaceId,
        status: ExecutionStatus.COMPLETED,
      };

      it('does not call getWorkflowExecutionById for metering when meteringService is omitted', async () => {
        await runWorkflowWithDefaults();

        expect(workflowExecutionRepository.getWorkflowExecutionById).not.toHaveBeenCalled();
      });

      it('calls reportWorkflowExecution when final execution exists', async () => {
        const reportWorkflowExecution = jest.fn().mockResolvedValue(undefined);
        const meteringService = { reportWorkflowExecution } as unknown as WorkflowsMeteringService;

        workflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue(finalExecution);

        await runWorkflowWithDefaults({ meteringService });

        expect(reportWorkflowExecution).toHaveBeenCalledTimes(1);
        expect(reportWorkflowExecution).toHaveBeenCalledWith(
          finalExecution,
          dependencies.cloudSetup
        );
      });

      it('does not call reportWorkflowExecution when getWorkflowExecutionById returns null', async () => {
        const reportWorkflowExecution = jest.fn().mockResolvedValue(undefined);
        const meteringService = { reportWorkflowExecution } as unknown as WorkflowsMeteringService;

        workflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue(null);

        await runWorkflowWithDefaults({ meteringService });

        expect(reportWorkflowExecution).not.toHaveBeenCalled();
      });

      it('logs warn and resolves when getWorkflowExecutionById throws in metering block', async () => {
        const reportWorkflowExecution = jest.fn().mockResolvedValue(undefined);
        const meteringService = { reportWorkflowExecution } as unknown as WorkflowsMeteringService;

        workflowExecutionRepository.getWorkflowExecutionById.mockRejectedValue(
          new Error('fetch failed')
        );

        await expect(runWorkflowWithDefaults({ meteringService })).resolves.toBeUndefined();

        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining(
            `Failed to fetch execution for metering (execution=${workflowRunId}): fetch failed`
          )
        );
        expect(reportWorkflowExecution).not.toHaveBeenCalled();
      });
    });
  });

  describe('workflow_execution_failed event emission', () => {
    const workflowRunId = 'run-1';
    const spaceId = 'default';
    const logger = loggingSystemMock.create().get();
    const fakeRequest = { headers: {} } as KibanaRequest;
    let dependencies: ReturnType<typeof mockContextDependencies>;
    let mockGetWorkflowExecutionById: jest.Mock;
    let mockGetLastFailedStepContext: jest.Mock;
    let mockGetWorkflowExecutionStatus: jest.Mock;
    let mockGetWorkflowExecution: jest.Mock;
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
      mockGetWorkflowExecutionStatus = jest.fn();
      mockGetWorkflowExecution = jest.fn();

      mockSetupDependencies.mockResolvedValue({
        workflowRuntime: {
          start: jest.fn().mockResolvedValue(undefined),
          getWorkflowExecutionStatus: mockGetWorkflowExecutionStatus,
          getWorkflowExecution: mockGetWorkflowExecution,
        },
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
      mockGetWorkflowExecutionStatus.mockReturnValue(ExecutionStatus.FAILED);
      mockGetWorkflowExecution.mockReturnValue(failedExecution);
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

      expect(mockGetWorkflowExecutionStatus).toHaveBeenCalled();
      expect(mockGetWorkflowExecution).toHaveBeenCalled();
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

    it('emits workflow_execution_failed with no step fields when failure was not due to a step', async () => {
      mockWorkflowExecutionLoop.mockRejectedValueOnce(new Error('Runtime error'));
      const failedExecution = {
        id: workflowRunId,
        workflowId: 'wf-1',
        spaceId,
        status: ExecutionStatus.FAILED,
        isTestRun: false,
        workflowDefinition: { name: 'Test Workflow', steps: [] },
        error: { type: 'Error', message: 'Runtime error' },
        createdAt: '2024-01-01T10:00:00.000Z',
        finishedAt: '2024-01-01T10:05:00.000Z',
        triggeredBy: 'manual',
      };
      mockGetWorkflowExecutionStatus.mockReturnValue(ExecutionStatus.FAILED);
      mockGetWorkflowExecution.mockReturnValue(failedExecution);
      mockGetWorkflowExecutionById.mockResolvedValue(failedExecution);
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
      ).rejects.toThrow('Runtime error');

      expect(mockEmitEvent).toHaveBeenCalledTimes(1);
      const emittedPayload = mockEmitEvent.mock.calls[0][0].payload;
      expect(emittedPayload.error.message).toBe('Runtime error');
      expect(emittedPayload.error).not.toHaveProperty('stepId');
      expect(emittedPayload.error).not.toHaveProperty('stepName');
    });

    it('does not emit when execution status is not FAILED', async () => {
      mockWorkflowExecutionLoop.mockRejectedValueOnce(new Error('Step failed'));
      mockGetWorkflowExecutionStatus.mockReturnValue(ExecutionStatus.COMPLETED);
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
      const testRunExecution = {
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
      };
      mockGetWorkflowExecutionStatus.mockReturnValue(ExecutionStatus.FAILED);
      mockGetWorkflowExecution.mockReturnValue(testRunExecution);

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
  });
});
