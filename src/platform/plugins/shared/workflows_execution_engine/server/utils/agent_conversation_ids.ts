/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowStepExecutionDto } from '@kbn/workflows';

/**
 * One `ai.agent` step's conversation join key, keyed by the step that produced it.
 *
 * The agent invocation opens its own root OTEL/APM trace, so the workflow's
 * `traceId` matches zero agent spans. The join that actually works is:
 *   step.output.conversation_id  ↔  attributes.gen_ai.conversation.id
 * on every agent tool span. When a workflow has multiple `ai.agent` steps,
 * each step has its own conversation id — callers must iterate these, not
 * assume a single id covers the whole run.
 */
export interface AgentConversationId {
  /** Stable step id from the workflow definition (e.g. `draft_creation`). */
  stepId: string;
  /** Conversation id persisted on the step's output by the `ai.agent` connector. */
  conversationId: string;
  /** Optional step type when present (`ai.agent`, …). */
  stepType?: string;
}

/**
 * Collects every non-empty `conversation_id` from workflow step executions.
 *
 * Why this exists as a platform helper rather than a suite-local helper:
 * - Multi-`ai.agent` workflows (e.g. draft → review → rewrite) produce one
 *   conversation id per agent step. Taking the first match silently drops
 *   every subsequent agent step's traces.
 * - `step_level_timeout` wrappers share the agent step's `stepId` but have
 *   `output: null`. Filtering on `stepId` alone therefore picks the wrapper
 *   and yields `undefined` with no error. Keying off the output shape avoids
 *   that trap.
 * - Dedupes by `conversationId` while preserving first-seen order, so a
 *   retry of the same agent step does not produce duplicate join keys.
 */
export function extractAgentConversationIds(
  steps: ReadonlyArray<Pick<WorkflowStepExecutionDto, 'stepId' | 'stepType' | 'output'>>
): AgentConversationId[] {
  const seen = new Set<string>();
  const result: AgentConversationId[] = [];

  for (const step of steps) {
    const conversationId = (step.output as { conversation_id?: unknown } | undefined)
      ?.conversation_id;
    if (typeof conversationId !== 'string' || conversationId.length === 0) {
      continue;
    }
    if (seen.has(conversationId)) {
      continue;
    }
    seen.add(conversationId);
    result.push({
      stepId: step.stepId,
      conversationId,
      ...(step.stepType !== undefined ? { stepType: step.stepType } : {}),
    });
  }

  return result;
}

/**
 * Convenience for the single-agent-step case. Prefer
 * {@link extractAgentConversationIds} whenever the workflow may contain more
 * than one `ai.agent` step — this returns only the first match and will
 * silently miss later agent steps.
 */
export function extractFirstAgentConversationId(
  steps: ReadonlyArray<Pick<WorkflowStepExecutionDto, 'stepId' | 'stepType' | 'output'>>
): string | undefined {
  return extractAgentConversationIds(steps)[0]?.conversationId;
}
