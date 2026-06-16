/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

export const WORKFLOW_FINISHED_EVENT_TYPE = 'workflows.workflowFinished' as const;

export const workflowFinishedPayloadSchema = z
  .object({
    spaceId: z.string(),
    workflowId: z.string(),
    workflowRunId: z.string(),
    status: z.string(),
  })
  .strict();

export type WorkflowFinishedPayload = z.infer<typeof workflowFinishedPayloadSchema>;

export const isWorkflowFinishedPayload = (value: unknown): value is WorkflowFinishedPayload =>
  workflowFinishedPayloadSchema.safeParse(value).success;

export interface WorkflowFinishedDomainEventMap {
  [WORKFLOW_FINISHED_EVENT_TYPE]: WorkflowFinishedPayload;
}
