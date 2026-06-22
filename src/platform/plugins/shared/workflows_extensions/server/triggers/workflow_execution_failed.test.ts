/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { WORKFLOW_TERMINATED_EVENT_TYPE } from '@kbn/domain-events/events/workflows';
import { workflowExecutionFailedTriggerDefinition } from './workflow_execution_failed';

const request = httpServerMock.createKibanaRequest();

const baseTerminatedPayload = {
  workflow: {
    id: 'workflow-1',
    name: 'My workflow',
    spaceId: 'default',
    isErrorHandler: false,
  },
  execution: {
    id: 'execution-1',
    startedAt: '2026-01-01T00:00:00.000Z',
    failedAt: '2026-01-01T00:01:00.000Z',
  },
  error: {
    message: 'Step failed',
    stepId: 'step-1',
  },
};

describe('workflowExecutionFailedTriggerDefinition', () => {
  const { mapEvent, matchesDomainEvent } = workflowExecutionFailedTriggerDefinition;
  const eventType = WORKFLOW_TERMINATED_EVENT_TYPE;

  it('matchesDomainEvent returns true only for failed terminal status', () => {
    expect(
      matchesDomainEvent!({
        type: eventType,
        payload: { ...baseTerminatedPayload, status: 'failed' },
        request,
      })
    ).toBe(true);

    for (const status of ['completed', 'cancelled', 'timed_out', 'skipped'] as const) {
      expect(
        matchesDomainEvent!({
          type: eventType,
          payload: { ...baseTerminatedPayload, status },
          request,
        })
      ).toBe(false);
    }
  });

  it('mapEvent maps failed terminated events without status in the trigger payload', () => {
    const result = mapEvent!({
      type: eventType,
      payload: {
        ...baseTerminatedPayload,
        status: 'failed',
      },
      request,
    });

    expect(result).toEqual({
      workflow: baseTerminatedPayload.workflow,
      execution: baseTerminatedPayload.execution,
      error: baseTerminatedPayload.error,
    });
  });
});
