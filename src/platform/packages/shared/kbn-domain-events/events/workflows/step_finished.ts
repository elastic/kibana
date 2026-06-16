/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const STEP_FINISHED_EVENT_TYPE = 'workflows.stepFinished' as const;

export const stepFinishedPayloadSchema = z
  .object({
    spaceId: z.string(),
    workflowRunId: z.string(),
    stepId: z.string(),
    stepType: z.string(),
    status: z.enum(['completed', 'failed']),
  })
  .strict();

export type StepFinishedPayload = z.infer<typeof stepFinishedPayloadSchema>;

export const isStepFinishedPayload = (value: unknown): value is StepFinishedPayload =>
  stepFinishedPayloadSchema.safeParse(value).success;

export interface StepFinishedDomainEventMap {
  [STEP_FINISHED_EVENT_TYPE]: StepFinishedPayload;
}
