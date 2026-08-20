/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowStepExecutionDto } from './v1';

/**
 * One `ai.agent` step's conversation join key, keyed by the step that produced it.
 *
 * The agent invocation opens its own root trace, so the workflow's `traceId`
 * matches no agent spans. Agent tool spans are instead joined via
 * `step.output.conversation_id` ↔ `attributes.gen_ai.conversation.id`.
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
 * Collects the conversation id of every `ai.agent` step execution.
 *
 * A workflow may contain multiple `ai.agent` steps, each with its own
 * conversation id, so all of them are returned. Only steps whose `stepType`
 * is `ai.agent` are considered: other step types (e.g. a `workflow.output`
 * step) may copy a `conversation_id` into their output and must not be
 * reported as agent join keys. Results are deduped by `conversationId` in
 * first-seen order so a retried step yields one join key.
 */
export function extractAgentConversationIds(
  steps: ReadonlyArray<Pick<WorkflowStepExecutionDto, 'stepId' | 'stepType' | 'output'>>
): AgentConversationId[] {
  const seen = new Set<string>();
  const result: AgentConversationId[] = [];

  const agentSteps = steps.filter((step) => step.stepType === 'ai.agent');

  for (const step of agentSteps) {
    const conversationId = (step.output as { conversation_id?: unknown } | undefined)
      ?.conversation_id;
    if (
      typeof conversationId === 'string' &&
      conversationId.length > 0 &&
      !seen.has(conversationId)
    ) {
      seen.add(conversationId);
      result.push({ stepId: step.stepId, conversationId, stepType: step.stepType });
    }
  }

  return result;
}
