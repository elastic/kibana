/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const STEP_STARTED_EVENT_TYPE = 'workflows.stepStarted' as const;

export const stepStartedPayloadSchema = z
  .object({
    spaceId: z.string(),
    workflowRunId: z.string(),
    stepId: z.string(),
    stepType: z.string(),
  })
  .strict();

export type StepStartedPayload = z.infer<typeof stepStartedPayloadSchema>;

export const isStepStartedPayload = (value: unknown): value is StepStartedPayload =>
  stepStartedPayloadSchema.safeParse(value).success;

export interface StepStartedDomainEventMap {
  [STEP_STARTED_EVENT_TYPE]: StepStartedPayload;
}
