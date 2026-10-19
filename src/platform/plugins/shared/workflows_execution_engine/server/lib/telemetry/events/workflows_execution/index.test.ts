/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type AnalyticsClient, createAnalytics } from '@elastic/ebt/client';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import { workflowExecutionEventSchemas } from '.';
import {
  type EventDrivenExecutionSuppressedParams,
  WorkflowExecutionTelemetryEventTypes,
} from './types';
import { WorkflowExecutionTelemetryClient } from '../../workflow_execution_telemetry_client';

/** Every composition and lineage field; a top-level execution reports none of them. */
const ALL_LINEAGE_FIELDS: readonly string[] = [
  'compositionDepth',
  'executionChain',
  'parentWorkflowId',
  'parentWorkflowInvocation',
];

const reportedFieldsAmong = (eventData: object, fields: readonly string[]): string[] =>
  Object.keys(eventData).filter((key) => fields.includes(key));

const EXECUTION_CHAIN = [
  { executionId: 'root-exec-id', invocation: 'sync', workflowId: 'root-wf-id' },
  { executionId: 'parent-exec-id', invocation: 'sync', workflowId: 'parent-wf-id' },
];

const TERMINAL_EVENT_TYPES = [
  WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCompleted,
  WorkflowExecutionTelemetryEventTypes.WorkflowExecutionFailed,
  WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCancelled,
] as const;

const createChildWorkflowExecution = (status: ExecutionStatus): EsWorkflowExecution => ({
  cancelRequested: false,
  context: {
    executionChain: EXECUTION_CHAIN,
    parentDepth: 1,
    parentWorkflowExecutionId: 'parent-exec-id',
    parentWorkflowId: 'parent-wf-id',
    parentWorkflowInvocation: 'sync',
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  createdBy: 'user',
  duration: 60000,
  error: null,
  finishedAt: '2024-01-01T00:01:00.000Z',
  id: 'child-exec-id',
  isTestRun: false,
  scopeStack: [],
  spaceId: 'default',
  startedAt: '2024-01-01T00:00:00.000Z',
  status,
  triggeredBy: 'workflow-step',
  workflowDefinition: { steps: [] } as Partial<WorkflowYaml> as WorkflowYaml,
  workflowId: 'child-wf-id',
  yaml: '',
});

const suppressedEventData: EventDrivenExecutionSuppressedParams = {
  eventName: 'Event-driven workflow execution suppressed at runtime',
  eventTriggerId: 'cases.updated',
  isManaged: false,
  isTestRun: false,
  logTriggerEventsEnabled: false,
  spaceId: 'default',
  triggerType: 'event',
  workflowExecutionId: 'exec-id',
  workflowId: 'wf-id',
};

describe('workflowExecutionEventSchemas', () => {
  describe('execution lineage fields', () => {
    it.each(TERMINAL_EVENT_TYPES)(
      '%s declares executionChain as an optional array of described keyword hops',
      (eventType) => {
        const schema: Record<string, unknown> = workflowExecutionEventSchemas[eventType];
        const keyword = {
          _meta: { description: expect.stringMatching(/\S/), optional: false },
          type: 'keyword',
        };

        expect(schema.executionChain).toEqual({
          _meta: { description: expect.stringMatching(/\S/), optional: true },
          items: { properties: { executionId: keyword, invocation: keyword, workflowId: keyword } },
          type: 'array',
        });
      }
    );

    it('the event-driven suppressed event does not declare executionChain', () => {
      const schema = workflowExecutionEventSchemas[
        WorkflowExecutionTelemetryEventTypes.EventDrivenExecutionSuppressed
      ] as Record<string, unknown>;

      expect(schema).not.toHaveProperty('executionChain');
    });
  });

  describe('dev-mode schema validation', () => {
    let analytics: AnalyticsClient;
    let logger: MockedLogger;

    beforeEach(() => {
      analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
      WorkflowExecutionTelemetryClient.setup(analytics);
      logger = loggerMock.create();
    });

    afterEach(async () => {
      await analytics.shutdown();
    });

    it.each([ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED])(
      'accepts the %s event of a child execution carrying its execution chain',
      (finalStatus) => {
        const client = new WorkflowExecutionTelemetryClient(analytics, logger);
        const reportEventSpy = jest.spyOn(analytics, 'reportEvent');

        client.reportWorkflowExecutionTerminated({
          finalStatus,
          stepExecutions: [],
          workflowExecution: createChildWorkflowExecution(finalStatus),
        });

        expect(logger.error).not.toHaveBeenCalled();
        expect(reportEventSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            compositionDepth: 2,
            executionChain: EXECUTION_CHAIN,
            parentWorkflowId: 'parent-wf-id',
            parentWorkflowInvocation: 'sync',
          })
        );
      }
    );

    it('rejects a hop with an undeclared key', () => {
      expect(() =>
        analytics.reportEvent(WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCompleted, {
          ...suppressedEventData,
          executionChain: [{ ...EXECUTION_CHAIN[0], spaceId: 'default' }],
        })
      ).toThrow(/excess key 'spaceId' found/);
    });

    it.each([ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED])(
      'accepts the %s event of a top-level execution carrying no lineage fields',
      (finalStatus) => {
        const client = new WorkflowExecutionTelemetryClient(analytics, logger);
        const reportEventSpy = jest.spyOn(analytics, 'reportEvent');

        client.reportWorkflowExecutionTerminated({
          finalStatus,
          stepExecutions: [],
          workflowExecution: {
            ...createChildWorkflowExecution(finalStatus),
            context: {},
            id: 'top-exec-id',
            triggeredBy: 'manual',
          },
        });

        expect(logger.error).not.toHaveBeenCalled();
        expect(reportEventSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ workflowExecutionId: 'top-exec-id' })
        );
        const [[, eventData]] = reportEventSpy.mock.calls;
        expect(reportedFieldsAmong(eventData, ALL_LINEAGE_FIELDS)).toEqual([]);
      }
    );

    it('accepts a suppressed event without lineage ids', () => {
      expect(() =>
        analytics.reportEvent(
          WorkflowExecutionTelemetryEventTypes.EventDrivenExecutionSuppressed,
          suppressedEventData
        )
      ).not.toThrow();
    });

    it('rejects a suppressed event carrying executionChain', () => {
      expect(() =>
        analytics.reportEvent(WorkflowExecutionTelemetryEventTypes.EventDrivenExecutionSuppressed, {
          ...suppressedEventData,
          executionChain: EXECUTION_CHAIN,
        })
      ).toThrow("excess key 'executionChain' found");
    });
  });
});
