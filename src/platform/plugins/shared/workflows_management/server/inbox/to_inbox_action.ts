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
import { ExecutionStatus } from '@kbn/workflows';

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
    // `timeout_at` and `response_mode: 'timed_out'` will land with the
    // step-level timeout work tracked in [security-team#16708](https://github.com/elastic/security-team/issues/16708).
  };
};

/**
 * Maps a terminated *or* responded-but-not-yet-resumed `waitForInput`
 * step execution to an {@link InboxAction} for the Inbox history (audit
 * log) feed.
 *
 * Two source-of-truth windows feed this mapper:
 *   1. **Responded, not yet resumed** — `respondedAt` is set but the
 *      engine hasn't written `finishedAt`. The step row is still
 *      `WAITING_FOR_INPUT`. The audit fields (`respondedBy`,
 *      `respondedAt`, `channel`) come straight from `markStepAsResponded`,
 *      which fires synchronously from the responder's request.
 *      `response_input` is the input the responder submitted, taken from
 *      the step's `input` snapshot? No — at this point the engine has
 *      not yet promoted the input to `output`, so we leave it `null`
 *      and let the next refetch (after Task Manager runs) fill it in.
 *   2. **Terminated** — `finishedAt` is set, status ∈ `completed |
 *      failed | cancelled`. `response_input` reads from `output`, which
 *      is what the engine writes via `finishStep(resumeInput)`.
 *
 * `response_mode`:
 *   - `'responded'` for clean completions and for the responded-but-not-
 *     yet-resumed window (UI may overlay a "Processing…" indicator on
 *     this row in the audit feed).
 *   - `'timed_out'` when the step settled with an error (covers the
 *     workflow-level timeout monitor and other failure paths).
 *
 * v1 behaviour also coerces every history row to `status: 'approved'`.
 * Splitting approve vs reject is a follow-up after the workflow team
 * lands per-action conventions on top of `respondedBy/At/channel`.
 */
export const toInboxHistoryAction = (step: EsWorkflowStepExecution): InboxAction => {
  const input = (step.input ?? {}) as { message?: unknown; schema?: unknown };
  const promptMessage =
    typeof input.message === 'string' && input.message.length > 0 ? input.message : undefined;
  const promptSchema =
    input.schema && typeof input.schema === 'object' && !Array.isArray(input.schema)
      ? (input.schema as Record<string, unknown>)
      : undefined;

  // Step output is only populated after the engine resumes and runs
  // `finishStep(resumeInput)`. During the responded-but-not-resumed
  // window it stays null; the refetch after the resume picks it up.
  const responseInput =
    step.output && typeof step.output === 'object' && !Array.isArray(step.output)
      ? (step.output as Record<string, unknown>)
      : null;

  const settledAbnormally =
    Boolean(step.error) ||
    step.status === ExecutionStatus.FAILED ||
    step.status === ExecutionStatus.CANCELLED;

  // `respondedAt` is the truth-bearer for "a human said something". Fall
  // back to `finishedAt` for legacy rows from before the audit fields
  // shipped (and for abnormal terminations where no human responded —
  // the responder column will simply render empty in those cases).
  const respondedAt = step.respondedAt ?? step.finishedAt ?? null;

  return {
    id: buildWorkflowSourceId(step),
    source_app: 'workflows',
    source_id: buildWorkflowSourceId(step),
    status: 'approved',
    title: promptMessage ?? `Step "${step.stepId}" was processed`,
    description: `Workflow ${step.workflowId} — step "${step.stepId}"`,
    input_message: promptMessage,
    input_schema: promptSchema,
    created_at: step.startedAt,
    responded_at: respondedAt,
    responded_by: step.respondedBy ?? null,
    channel: step.channel ?? null,
    response_mode: settledAbnormally ? 'timed_out' : 'responded',
    response_input: responseInput,
  };
};
