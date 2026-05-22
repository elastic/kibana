/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InboxAction } from '@kbn/inbox-common';
import type { EsWorkflowStepExecution } from '@kbn/workflows';

/**
 * Composite identifier that makes a Workflows step execution uniquely
 * addressable within the Inbox. Format: `workflowId:workflowRunId:stepExecutionId`.
 * The `workflowRunId` is what the `resume` API needs, and the `id` (step
 * execution doc id) is retained for traceability / future sub-workflow
 * propagation work per [security-team#16710](https://github.com/elastic/security-team/issues/16710).
 */
export const buildWorkflowSourceId = (step: EsWorkflowStepExecution): string =>
  `${step.workflowId}:${step.workflowRunId}:${step.id}`;

/**
 * Extracts the `workflowRunId` (a.k.a. executionId) from a composite source id.
 * Returns `null` if the source id is malformed — the route handler treats
 * that as a 404.
 */
export const parseWorkflowSourceId = (
  sourceId: string
): { workflowId: string; executionId: string; stepExecutionId: string } | null => {
  const parts = sourceId.split(':');
  if (parts.length < 3) return null;
  const [workflowId, executionId, ...rest] = parts;
  return {
    workflowId,
    executionId,
    // Re-join in case the step execution id contains colons (defensive).
    stepExecutionId: rest.join(':'),
  };
};

/**
 * Maps a paused `waitForInput` step execution to the common {@link InboxAction}
 * shape. Pure function, no plugin deps — safe to unit test in isolation.
 *
 * Aligned with HITL GA [security-team#16707](https://github.com/elastic/security-team/issues/16707) (schema-driven form):
 * we surface `input.message` as the responder's prompt and `input.schema` as
 * the shape the response must conform to.
 */
export const toInboxAction = (step: EsWorkflowStepExecution): InboxAction => {
  const input = (step.input ?? {}) as {
    message?: unknown;
    schema?: unknown;
  };
  const message =
    typeof input.message === 'string' && input.message.length > 0 ? input.message : undefined;
  const schema =
    input.schema && typeof input.schema === 'object' && !Array.isArray(input.schema)
      ? (input.schema as Record<string, unknown>)
      : undefined;

  return {
    id: buildWorkflowSourceId(step),
    source_app: 'workflows',
    source_id: buildWorkflowSourceId(step),
    status: 'pending',
    // Short summary: prefer the rendered message, fall back to step id.
    title: message ?? `Step "${step.stepId}" is waiting for input`,
    description: `Workflow ${step.workflowId} — step "${step.stepId}"`,
    input_message: message,
    input_schema: schema,
    created_at: step.startedAt,
    response_mode: 'pending',
    // `timeout_at`, `responded_by`, `responded_at`, `channel` and
    // transitions to `response_mode: 'timed_out'` will be populated once
    // upstream #16708 + PR kibana#256603 expose those on the step record.
  };
};
