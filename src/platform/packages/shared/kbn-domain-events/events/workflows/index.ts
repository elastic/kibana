/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import { WORKFLOW_STARTED_EVENT_TYPE, workflowStartedPayloadSchema } from './workflow_started';
import type { WorkflowStartedDomainEventMap } from './workflow_started';
import {
  WORKFLOW_TERMINATED_EVENT_TYPE,
  workflowTerminatedPayloadSchema,
} from './workflow_terminated';
import type { WorkflowTerminatedDomainEventMap } from './workflow_terminated';
import { STEP_STARTED_EVENT_TYPE, stepStartedPayloadSchema } from './step_started';
import type { StepStartedDomainEventMap } from './step_started';
import { STEP_FINISHED_EVENT_TYPE, stepFinishedPayloadSchema } from './step_finished';
import type { StepFinishedDomainEventMap } from './step_finished';

export type WorkflowsDomainEventMap = WorkflowStartedDomainEventMap &
  WorkflowTerminatedDomainEventMap &
  StepStartedDomainEventMap &
  StepFinishedDomainEventMap;

type WorkflowsDomainEventMapSchemas = {
  [K in keyof WorkflowsDomainEventMap]: z.ZodType<WorkflowsDomainEventMap[K]>;
};

export {
  WORKFLOW_STARTED_EVENT_TYPE,
  workflowStartedPayloadSchema,
  isWorkflowStartedPayload,
} from './workflow_started';
export type { WorkflowStartedPayload } from './workflow_started';
export {
  WORKFLOW_TERMINATED_EVENT_TYPE,
  workflowTerminatedPayloadSchema,
  isWorkflowTerminatedPayload,
} from './workflow_terminated';
export type { WorkflowTerminatedPayload } from './workflow_terminated';
export {
  STEP_STARTED_EVENT_TYPE,
  stepStartedPayloadSchema,
  isStepStartedPayload,
} from './step_started';
export type { StepStartedPayload } from './step_started';
export {
  STEP_FINISHED_EVENT_TYPE,
  stepFinishedPayloadSchema,
  isStepFinishedPayload,
} from './step_finished';
export type { StepFinishedPayload } from './step_finished';

export const workflowsEventPayloadSchemas = {
  [WORKFLOW_STARTED_EVENT_TYPE]: workflowStartedPayloadSchema,
  [WORKFLOW_TERMINATED_EVENT_TYPE]: workflowTerminatedPayloadSchema,
  [STEP_STARTED_EVENT_TYPE]: stepStartedPayloadSchema,
  [STEP_FINISHED_EVENT_TYPE]: stepFinishedPayloadSchema,
} as const satisfies WorkflowsDomainEventMapSchemas;
