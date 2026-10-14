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

const LINEAGE_FIELDS = ['parentWorkflowExecutionId', 'rootWorkflowExecutionId'] as const;

const TERMINAL_EVENT_TYPES = [
  WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCompleted,
  WorkflowExecutionTelemetryEventTypes.WorkflowExecutionFailed,
  WorkflowExecutionTelemetryEventTypes.WorkflowExecutionCancelled,
] as const;

const createChildWorkflowExecution = (status: ExecutionStatus): EsWorkflowExecution => ({
  cancelRequested: false,
  context: {
    parentDepth: 1,
    parentWorkflowExecutionId: 'parent-exec-id',
    parentWorkflowId: 'parent-wf-id',
    parentWorkflowInvocation: 'sync',
    rootWorkflowExecutionId: 'root-exec-id',
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
    it.each(
      TERMINAL_EVENT_TYPES.flatMap((eventType) =>
        LINEAGE_FIELDS.map((field) => [eventType, field] as const)
      )
    )('%s declares %s as an optional, described keyword', (eventType, field) => {
      const schema: Record<string, unknown> = workflowExecutionEventSchemas[eventType];

      expect(schema[field]).toEqual({
        _meta: { description: expect.stringMatching(/\S/), optional: true },
        type: 'keyword',
      });
    });

    it.each(LINEAGE_FIELDS)('the event-driven suppressed event does not declare %s', (field) => {
      const schema = workflowExecutionEventSchemas[
        WorkflowExecutionTelemetryEventTypes.EventDrivenExecutionSuppressed
      ] as Record<string, unknown>;

      expect(schema).not.toHaveProperty(field);
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
      'accepts the %s event of a child execution carrying lineage ids',
      (finalStatus) => {
        const client = new WorkflowExecutionTelemetryClient(analytics, logger);

        client.reportWorkflowExecutionTerminated({
          finalStatus,
          stepExecutions: [],
          workflowExecution: createChildWorkflowExecution(finalStatus),
        });

        expect(logger.error).not.toHaveBeenCalled();
      }
    );

    it.each([ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED])(
      'accepts the %s event of a top-level execution carrying its own id as the root',
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
          expect.objectContaining({ rootWorkflowExecutionId: 'top-exec-id' })
        );
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

    it.each(LINEAGE_FIELDS)('rejects a suppressed event carrying %s', (field) => {
      expect(() =>
        analytics.reportEvent(WorkflowExecutionTelemetryEventTypes.EventDrivenExecutionSuppressed, {
          ...suppressedEventData,
          [field]: 'some-exec-id',
        })
      ).toThrow(`excess key '${field}' found`);
    });
  });
});
