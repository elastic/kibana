/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

const workflowExecutionTerminalWorkflowSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    spaceId: z.string(),
    isErrorHandler: z.boolean(),
  })
  .strict();

const workflowExecutionTerminalExecutionSchema = z
  .object({
    id: z.string(),
    startedAt: z.string(),
    failedAt: z.string(),
  })
  .strict();

const workflowExecutionTerminalErrorSchema = z
  .object({
    message: z.string(),
    stepId: z.string().optional(),
    stepName: z.string().optional(),
    stepExecutionId: z.string().optional(),
  })
  .strict();

/** Matches the payload built by `buildWorkflowExecutionFailedPayload` in workflows_execution_engine. */
export const workflowExecutionTerminalPayloadSchema = z
  .object({
    status: z.enum(['completed', 'failed', 'cancelled', 'timed_out', 'skipped']),
    workflow: workflowExecutionTerminalWorkflowSchema,
    execution: workflowExecutionTerminalExecutionSchema,
    error: workflowExecutionTerminalErrorSchema,
  })
  .strict();

export type WorkflowExecutionTerminalPayload = z.infer<
  typeof workflowExecutionTerminalPayloadSchema
>;
