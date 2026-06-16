/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const WORKFLOW_STARTED_EVENT_TYPE = 'workflows.workflowStarted' as const;

export const workflowStartedPayloadSchema = z
  .object({
    spaceId: z.string(),
    workflowId: z.string(),
    workflowRunId: z.string(),
  })
  .strict();

export type WorkflowStartedPayload = z.infer<typeof workflowStartedPayloadSchema>;

export const isWorkflowStartedPayload = (value: unknown): value is WorkflowStartedPayload =>
  workflowStartedPayloadSchema.safeParse(value).success;

export interface WorkflowStartedDomainEventMap {
  [WORKFLOW_STARTED_EVENT_TYPE]: WorkflowStartedPayload;
}
