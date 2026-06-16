/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import {
  WORKFLOW_STARTED_EVENT_TYPE,
  workflowStartedPayloadSchema,
  isWorkflowStartedPayload,
} from './workflow_started';
import type { WorkflowStartedPayload } from './workflow_started';
import {
  WORKFLOW_FINISHED_EVENT_TYPE,
  workflowFinishedPayloadSchema,
  isWorkflowFinishedPayload,
} from './workflow_finished';
import type { WorkflowFinishedPayload } from './workflow_finished';
import {
  STEP_STARTED_EVENT_TYPE,
  stepStartedPayloadSchema,
  isStepStartedPayload,
} from './step_started';
import type { StepStartedPayload } from './step_started';
import {
  STEP_FINISHED_EVENT_TYPE,
  stepFinishedPayloadSchema,
  isStepFinishedPayload,
} from './step_finished';
import type { StepFinishedPayload } from './step_finished';
import { workflowsEventPayloadSchemas } from '.';
import type { WorkflowsDomainEventMap } from '.';
import { domainEventPayloadSchemas } from '..';
import type { DomainEventMap } from '..';

describe('workflows domain event schemas', () => {
  const validWorkflowStartedPayload: WorkflowStartedPayload = {
    spaceId: 'default',
    workflowId: 'workflow-1',
    workflowRunId: 'run-1',
  };

  const validWorkflowFinishedPayload: WorkflowFinishedPayload = {
    spaceId: 'default',
    workflowId: 'workflow-1',
    workflowRunId: 'run-1',
    status: 'completed',
  };

  const validStepStartedPayload: StepStartedPayload = {
    spaceId: 'default',
    workflowRunId: 'run-1',
    stepId: 'step-1',
    stepType: 'connector',
  };

  const validStepFinishedPayload: StepFinishedPayload = {
    spaceId: 'default',
    workflowRunId: 'run-1',
    stepId: 'step-1',
    stepType: 'connector',
    status: 'failed',
  };

  it('validates workflow lifecycle payloads via guards', () => {
    expect(isWorkflowStartedPayload(validWorkflowStartedPayload)).toBe(true);
    expect(isWorkflowFinishedPayload(validWorkflowFinishedPayload)).toBe(true);
    expect(isStepStartedPayload(validStepStartedPayload)).toBe(true);
    expect(isStepFinishedPayload(validStepFinishedPayload)).toBe(true);

    expect(isWorkflowStartedPayload({ ...validWorkflowStartedPayload, extra: true })).toBe(false);
    expect(isStepFinishedPayload({ ...validStepFinishedPayload, status: 'pending' })).toBe(false);
  });

  it('domainEventPayloadSchemas validates the same payloads as per-event guards', () => {
    expect(
      domainEventPayloadSchemas[WORKFLOW_STARTED_EVENT_TYPE].safeParse(validWorkflowStartedPayload)
        .success
    ).toBe(isWorkflowStartedPayload(validWorkflowStartedPayload));
    expect(
      domainEventPayloadSchemas[WORKFLOW_FINISHED_EVENT_TYPE].safeParse(
        validWorkflowFinishedPayload
      ).success
    ).toBe(isWorkflowFinishedPayload(validWorkflowFinishedPayload));
    expect(
      domainEventPayloadSchemas[STEP_STARTED_EVENT_TYPE].safeParse(validStepStartedPayload).success
    ).toBe(isStepStartedPayload(validStepStartedPayload));
    expect(
      domainEventPayloadSchemas[STEP_FINISHED_EVENT_TYPE].safeParse(validStepFinishedPayload)
        .success
    ).toBe(isStepFinishedPayload(validStepFinishedPayload));
    expect(
      workflowsEventPayloadSchemas[STEP_FINISHED_EVENT_TYPE].safeParse(validStepFinishedPayload)
        .success
    ).toBe(true);
  });

  it('keeps schema keys aligned with DomainEventMap payload types', () => {
    type WorkflowStartedSchemaOutput = z.infer<typeof workflowStartedPayloadSchema>;
    type WorkflowFinishedSchemaOutput = z.infer<typeof workflowFinishedPayloadSchema>;
    type StepStartedSchemaOutput = z.infer<typeof stepStartedPayloadSchema>;
    type StepFinishedSchemaOutput = z.infer<typeof stepFinishedPayloadSchema>;

    const startedPayload: DomainEventMap[typeof WORKFLOW_STARTED_EVENT_TYPE] =
      validWorkflowStartedPayload;
    const finishedPayload: DomainEventMap[typeof WORKFLOW_FINISHED_EVENT_TYPE] =
      validWorkflowFinishedPayload;

    expect(workflowStartedPayloadSchema.parse(validWorkflowStartedPayload)).toEqual(startedPayload);
    expect(workflowFinishedPayloadSchema.parse(validWorkflowFinishedPayload)).toEqual(
      finishedPayload
    );

    const parsedStarted: WorkflowStartedSchemaOutput = workflowStartedPayloadSchema.parse(
      validWorkflowStartedPayload
    );
    const parsedFinished: WorkflowFinishedSchemaOutput = workflowFinishedPayloadSchema.parse(
      validWorkflowFinishedPayload
    );
    const parsedStepStarted: StepStartedSchemaOutput =
      stepStartedPayloadSchema.parse(validStepStartedPayload);
    const parsedStepFinished: StepFinishedSchemaOutput =
      stepFinishedPayloadSchema.parse(validStepFinishedPayload);

    expect(parsedStarted).toEqual(validWorkflowStartedPayload);
    expect(parsedFinished).toEqual(validWorkflowFinishedPayload);
    expect(parsedStepStarted).toEqual(validStepStartedPayload);
    expect(parsedStepFinished).toEqual(validStepFinishedPayload);

    const workflowsMapKey: keyof WorkflowsDomainEventMap = WORKFLOW_STARTED_EVENT_TYPE;
    expect(workflowsMapKey).toBe(WORKFLOW_STARTED_EVENT_TYPE);
  });
});
