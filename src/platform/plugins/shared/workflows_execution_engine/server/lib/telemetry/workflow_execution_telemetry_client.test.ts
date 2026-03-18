/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import { analyticsServiceMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import { WorkflowExecutionTelemetryEventTypes } from './events/workflows_execution/types';
import { WorkflowExecutionTelemetryClient } from './workflow_execution_telemetry_client';

describe('WorkflowExecutionTelemetryClient', () => {
  let telemetry: jest.Mocked<AnalyticsServiceSetup>;
  let logger: MockedLogger;
  let client: WorkflowExecutionTelemetryClient;

  beforeEach(() => {
    telemetry = analyticsServiceMock.createAnalyticsServiceSetup();
    logger = loggerMock.create();
    client = new WorkflowExecutionTelemetryClient(telemetry, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockWorkflowExecution = (
    overrides?: Partial<EsWorkflowExecution>
  ): EsWorkflowExecution => {
    return {
      id: 'test-execution-id',
      workflowId: 'test-workflow-id',
      spaceId: 'default',
      isTestRun: false,
      status: ExecutionStatus.COMPLETED,
      context: {},
      workflowDefinition: {
        steps: [],
      } as Partial<WorkflowYaml> as WorkflowYaml,
      yaml: '',
      scopeStack: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      error: null,
      createdBy: 'user',
      startedAt: '2024-01-01T00:00:00.000Z',
      finishedAt: '2024-01-01T00:01:00.000Z',
      cancelRequested: false,
      duration: 60000,
      triggeredBy: 'manual',
      ...overrides,
    };
  };

  const createMockStepExecution = (
    overrides?: Partial<EsWorkflowStepExecution>
  ): EsWorkflowStepExecution => {
    return {
      id: 'test-step-execution-id',
      stepId: 'test-step-id',
      stepType: 'slack.postMessage',
      spaceId: 'default',
      scopeStack: [],
      workflowRunId: 'test-execution-id',
      workflowId: 'test-workflow-id',
      status: ExecutionStatus.COMPLETED,
      startedAt: '2024-01-01T00:00:00.000Z',
      finishedAt: '2024-01-01T00:00:30.000Z',
      executionTimeMs: 30000,
      topologicalIndex: 0,
      globalExecutionIndex: 0,
      stepExecutionIndex: 0,
      ...overrides,
    };
  };

  describe('reportWorkflowExecutionCompleted', () => {
    it('should report workflow execution completed event with all metadata', () => {
      const workflowExecution = createMockWorkflowExecution({
        workflowDefinition: {
          steps: [
            {
              name: 'step1',
              type: 'slack.postMessage',
              'connector-id': 'connector-1',
              with: { message: 'test' },
            },
            {
              name: 'step2',
              type: 'http.post',
              'connector-id': 'connector-2',
              with: { url: 'https://example.com' },
            },
          ],
          triggers: [{ type: 'scheduled', with: { every: '1h' } }],
          settings: {
            timeout: '5m',
            concurrency: { max: 10 },
            'on-failure': { continue: true },
          },
        } as unknown as WorkflowYaml,
      });

      const stepExecutions = [
        createMockStepExecution({
          stepId: 'step1',
          status: ExecutionStatus.COMPLETED,
          startedAt: '2024-01-01T00:00:01.000Z', // 1 second after workflow started
          finishedAt: '2024-01-01T00:00:05.000Z', // 4 seconds duration
          executionTimeMs: 4000,
          stepType: 'slack.postMessage',
        }),
        createMockStepExecution({
          stepId: 'step2',
          status: ExecutionStatus.COMPLETED,
          startedAt: '2024-01-01T00:00:02.000Z', // 2 seconds after workflow started
          finishedAt: '2024-01-01T00:00:08.000Z', // 6 seconds duration
          executionTimeMs: 6000,
          stepType: 'http.post',
        }),
      ];

      const workflowExecutionWithQueueMetrics = {
        ...workflowExecution,
        queueMetrics: {
          scheduledAt: '2024-01-01T00:00:00.000Z',
          runAt: '2024-01-01T00:00:00.000Z',
          startedAt: '2024-01-01T00:00:00.500Z',
          queueDelayMs: 500,
          scheduleDelayMs: 500,
        },
      };

      client.reportWorkflowExecutionCompleted({
        workflowExecution: workflowExecutionWithQueueMetrics,
        stepExecutions,
      });

      expect(telemetry.reportEvent).toHaveBeenCalledTimes(1);
      const [eventType, eventData] = telemetry.reportEvent.mock.calls[0];
      expect(eventType).toBe(WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCompleted);
      expect(eventData).toMatchObject({
        workflowExecutionId: 'test-execution-id',
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        triggerType: 'manual',
        isTestRun: false,
        stepCount: 2,
        stepTypes: expect.arrayContaining(['slack.postMessage', 'http.post']),
        connectorTypes: expect.arrayContaining(['slack', 'http']),
        hasScheduledTriggers: true,
        hasAlertTriggers: false,
        hasTimeout: true,
        hasConcurrency: true,
        hasOnFailure: true,
        executedStepCount: 2,
        successfulStepCount: 2,
        failedStepCount: 0,
        skippedStepCount: 0,
        timeToFirstStep: 1000, // 1 second difference
        queueDelayMs: 500,
        timedOut: false,
        timeoutMs: 300000, // 5 minutes in ms
        stepDurations: [
          {
            stepId: 'step1',
            stepType: 'slack.postMessage',
            duration: 4000, // 4 seconds (from 00:00:01 to 00:00:05)
          },
          {
            stepId: 'step2',
            stepType: 'http.post',
            duration: 6000, // 6 seconds (from 00:00:02 to 00:00:08)
          },
        ],
      });
    });

    it('should include alert rule ID when triggered by alert', () => {
      const workflowExecution = createMockWorkflowExecution({
        triggeredBy: 'alert',
        context: {
          event: {
            type: 'alert',
            rule: {
              id: 'alert-rule-123',
            },
          },
        },
      });

      client.reportWorkflowExecutionCompleted({
        workflowExecution,
        stepExecutions: [],
      });

      const [, eventData] = telemetry.reportEvent.mock.calls[0];
      expect(eventData).toMatchObject({
        triggerType: 'alert',
        ruleId: 'alert-rule-123',
      });
    });

    it('should calculate timeout exceeded when workflow timed out', () => {
      const workflowExecution = createMockWorkflowExecution({
        status: ExecutionStatus.TIMED_OUT,
        workflowDefinition: {
          steps: [],
          settings: {
            timeout: '1m', // 60 seconds
          },
        } as unknown as WorkflowYaml,
        startedAt: '2024-01-01T00:00:00.000Z',
        finishedAt: '2024-01-01T00:01:30.000Z', // 90 seconds later
      });

      client.reportWorkflowExecutionCompleted({
        workflowExecution,
        stepExecutions: [],
      });

      const [, eventData] = telemetry.reportEvent.mock.calls[0];
      expect(eventData).toMatchObject({
        timedOut: true,
        timeoutMs: 60000, // 1 minute
        timeoutExceededByMs: 30000, // 30 seconds over
      });
    });

    it('should handle missing queue metrics gracefully', () => {
      const workflowExecution = createMockWorkflowExecution();

      client.reportWorkflowExecutionCompleted({
        workflowExecution,
        stepExecutions: [],
      });

      const [, eventData] = telemetry.reportEvent.mock.calls[0];
      expect(eventData).not.toHaveProperty('queueDelayMs');
    });
  });

  describe('reportWorkflowExecutionFailed', () => {
    it('should report workflow execution failed event with error details', () => {
      const workflowExecution = createMockWorkflowExecution({
        status: ExecutionStatus.FAILED,
        error: {
          message: 'Workflow failed',
          type: 'ExecutionError',
        },
        workflowDefinition: {
          steps: [
            {
              name: 'step1',
              type: 'slack.postMessage',
              'connector-id': 'connector-1',
              with: { message: 'test' },
            },
          ],
        } as unknown as WorkflowYaml,
      });

      const stepExecutions = [
        createMockStepExecution({
          stepId: 'step1',
          status: ExecutionStatus.COMPLETED,
          startedAt: '2024-01-01T00:00:01.000Z',
          finishedAt: '2024-01-01T00:00:05.000Z',
          stepType: 'slack.postMessage',
        }),
        createMockStepExecution({
          stepId: 'step2',
          status: ExecutionStatus.FAILED,
          stepType: 'http.post',
          startedAt: '2024-01-01T00:00:06.000Z',
          finishedAt: '2024-01-01T00:00:10.000Z',
        }),
      ];

      const workflowExecutionWithQueueMetrics = {
        ...workflowExecution,
        queueMetrics: {
          scheduledAt: '2024-01-01T00:00:00.000Z',
          runAt: '2024-01-01T00:00:00.000Z',
          startedAt: '2024-01-01T00:00:00.200Z',
          queueDelayMs: 200,
          scheduleDelayMs: 200,
        },
      };

      client.reportWorkflowExecutionFailed({
        workflowExecution: workflowExecutionWithQueueMetrics,
        stepExecutions,
      });

      expect(telemetry.reportEvent).toHaveBeenCalledTimes(1);
      const [eventType, eventData] = telemetry.reportEvent.mock.calls[0];
      expect(eventType).toBe(WorkflowExecutionTelemetryEventTypes.WorkflowExecutionFailed);
      expect(eventData).toMatchObject({
        workflowExecutionId: 'test-execution-id',
        errorMessage: 'Workflow failed',
        errorType: 'ExecutionError',
        failedStepId: 'step2',
        failedStepType: 'http.post',
        executedStepCount: 2,
        successfulStepCount: 1,
        errorHandled: true,
        queueDelayMs: 200,
        timedOut: false,
      });
    });

    it('should include timeout information when workflow timed out', () => {
      const workflowExecution = createMockWorkflowExecution({
        status: ExecutionStatus.TIMED_OUT,
        workflowDefinition: {
          steps: [],
          settings: {
            timeout: '30s',
          },
        } as unknown as WorkflowYaml,
        startedAt: '2024-01-01T00:00:00.000Z',
        finishedAt: '2024-01-01T00:01:00.000Z', // 60 seconds later
      });

      client.reportWorkflowExecutionFailed({
        workflowExecution,
        stepExecutions: [],
      });

      const [, eventData] = telemetry.reportEvent.mock.calls[0];
      expect(eventData).toMatchObject({
        timedOut: true,
        timeoutMs: 30000, // 30 seconds
        timeoutExceededByMs: 30000, // 30 seconds over
      });
    });
  });

  describe('reportWorkflowExecutionCancelled', () => {
    it('should report workflow execution cancelled event', () => {
      const workflowExecution = createMockWorkflowExecution({
        status: ExecutionStatus.CANCELLED,
        cancellationReason: 'User cancelled',
        cancelledAt: '2024-01-01T00:00:30.000Z',
      });

      const stepExecutions = [
        createMockStepExecution({ stepId: 'step1', status: ExecutionStatus.COMPLETED }),
      ];

      const workflowExecutionWithQueueMetrics = {
        ...workflowExecution,
        queueMetrics: {
          scheduledAt: '2024-01-01T00:00:00.000Z',
          runAt: '2024-01-01T00:00:00.000Z',
          startedAt: '2024-01-01T00:00:00.100Z',
          queueDelayMs: 100,
          scheduleDelayMs: 100,
        },
      };

      client.reportWorkflowExecutionCancelled({
        workflowExecution: workflowExecutionWithQueueMetrics,
        stepExecutions,
      });

      expect(telemetry.reportEvent).toHaveBeenCalledTimes(1);
      const [eventType, eventData] = telemetry.reportEvent.mock.calls[0];
      expect(eventType).toBe(WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCancelled);
      expect(eventData).toMatchObject({
        workflowExecutionId: 'test-execution-id',
        cancellationReason: 'User cancelled',
        executedStepCount: 1,
        successfulStepCount: 1,
        queueDelayMs: 100,
        timedOut: false,
      });
    });
  });

  describe('execution metadata extraction', () => {
    it('should extract execution metadata correctly', () => {
      const workflowExecution = createMockWorkflowExecution({
        workflowDefinition: {
          steps: [
            {
              name: 'step1',
              type: 'slack.postMessage',
              'connector-id': 'connector-1',
              with: { message: 'test' },
            },
          ],
        } as unknown as WorkflowYaml,
      });

      const stepExecutions = [
        createMockStepExecution({
          stepId: 'step1',
          stepType: 'slack.postMessage',
          status: ExecutionStatus.COMPLETED,
          scopeStack: [{ stepId: 'step1', nestedScopes: [] }],
        }),
        createMockStepExecution({
          stepId: 'step1', // Same step ID (retry or loop)
          stepType: 'slack.postMessage',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 1,
          scopeStack: [
            { stepId: 'step1', nestedScopes: [] },
            { stepId: 'foreach', nestedScopes: [] },
          ],
        }),
      ];

      client.reportWorkflowExecutionCompleted({
        workflowExecution,
        stepExecutions,
      });

      const [, eventData] = telemetry.reportEvent.mock.calls[0];
      expect(eventData).toMatchObject({
        executedStepCount: 2,
        successfulStepCount: 2,
        executedConnectorTypes: ['slack'],
        maxExecutionDepth: 2,
        hasRetries: true, // Same step ID executed twice
        uniqueStepIdsExecuted: 1,
      });
    });
  });

  describe('error handling', () => {
    it('should log error and not throw when reportEvent fails', () => {
      const workflowExecution = createMockWorkflowExecution();
      const error = new Error('Telemetry error');
      telemetry.reportEvent.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        client.reportWorkflowExecutionCompleted({
          workflowExecution,
          stepExecutions: [],
        });
      }).not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error reporting event'));
    });
  });

  describe('timeout edge cases', () => {
    it('should handle missing timeout configuration', () => {
      const workflowExecution = createMockWorkflowExecution({
        workflowDefinition: {
          steps: [],
        } as unknown as WorkflowYaml,
      });

      client.reportWorkflowExecutionCompleted({
        workflowExecution,
        stepExecutions: [],
      });

      const [, eventData] = telemetry.reportEvent.mock.calls[0];
      expect(eventData).toMatchObject({
        timedOut: false,
      });
      expect(eventData).not.toHaveProperty('timeoutMs');
      expect(eventData).not.toHaveProperty('timeoutExceededByMs');
    });

    it('should handle invalid timeout format gracefully', () => {
      const workflowExecution = createMockWorkflowExecution({
        workflowDefinition: {
          steps: [],
          settings: {
            timeout: 'invalid-format',
          },
        } as unknown as WorkflowYaml,
      });

      client.reportWorkflowExecutionCompleted({
        workflowExecution,
        stepExecutions: [],
      });

      const [, eventData] = telemetry.reportEvent.mock.calls[0];
      expect(eventData).toMatchObject({
        timedOut: false,
      });
      expect(eventData).not.toHaveProperty('timeoutMs');
    });

    it('should not calculate timeout exceeded when not timed out', () => {
      const workflowExecution = createMockWorkflowExecution({
        status: ExecutionStatus.COMPLETED,
        workflowDefinition: {
          steps: [],
          settings: {
            timeout: '1m',
          },
        } as unknown as WorkflowYaml,
      });

      client.reportWorkflowExecutionCompleted({
        workflowExecution,
        stepExecutions: [],
      });

      const [, eventData] = telemetry.reportEvent.mock.calls[0];
      expect(eventData).toMatchObject({
        timedOut: false,
        timeoutMs: 60000,
      });
      expect(eventData).not.toHaveProperty('timeoutExceededByMs');
    });
  });
});
