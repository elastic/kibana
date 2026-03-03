/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/server';
import { AiGuardrailsStepCommonDefinition } from '../../../../common/steps/ai';
import { createServerStepDefinition } from '../../../step_registry/types';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../../../types';
import { resolveConnectorId } from '../utils/resolve_connector_id';

const GUARDRAIL_SYSTEM_PROMPT = `You are a guardrail evaluator. Your job is to decide whether the user message and context below are acceptable to proceed (e.g. no harmful content, no policy violations, no off-topic or inappropriate requests).

Respond with JSON only. Use this exact shape:
- If acceptable: {"pass": true}
- If not acceptable: {"pass": false, "reason": "brief explanation"}

Do not include any other text or markdown.`;

/** Max conversation turns included in context (most recent only). */
const MAX_CONVERSATION_HISTORY_MESSAGES = 20;

/** Max characters per attachment's stringified data; beyond this we truncate. */
const MAX_ATTACHMENT_DATA_CHARS = 5000;

/** Max number of attachments included in context. */
const MAX_ATTACHMENTS = 10;

function truncate(str: string, maxChars: number): string {
  if (str.length <= maxChars) return str;
  return `${str.slice(0, maxChars)}...[truncated]`;
}

function buildContextText(input: {
  message: string;
  conversation_history?: Array<{ role?: string; content: string }>;
  attachments?: Array<{ type: string; data: Record<string, unknown> }>;
}): string {
  const parts: string[] = ['## Current message\n', input.message];

  if (input.conversation_history?.length) {
    const recent = input.conversation_history.slice(-MAX_CONVERSATION_HISTORY_MESSAGES);
    parts.push('\n## Conversation history\n');
    for (const msg of recent) {
      const role = msg.role ?? 'user';
      if (msg.content) {
        parts.push(`[${role}]: ${msg.content}\n`);
      }
    }
  }

  if (input.attachments?.length) {
    const limited = input.attachments.slice(0, MAX_ATTACHMENTS);
    parts.push('\n## Attachments\n');
    for (const att of limited) {
      if (att.data && typeof att.data === 'object') {
        try {
          const raw = JSON.stringify(att.data);
          parts.push(`[${att.type}]: ${truncate(raw, MAX_ATTACHMENT_DATA_CHARS)}\n`);
        } catch {
          const raw = String(att.data);
          parts.push(`[${att.type}]: ${truncate(raw, MAX_ATTACHMENT_DATA_CHARS)}\n`);
        }
      }
    }
  }

  return parts.join('');
}

export const aiGuardrailsStepDefinition = (
  coreSetup: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>
) =>
  createServerStepDefinition({
    ...AiGuardrailsStepCommonDefinition,
    handler: async (context) => {
      const [, { inference }] = await coreSetup.getStartServices();

      const resolvedConnectorId = await resolveConnectorId(
        context.config['connector-id'],
        inference,
        context.contextManager.getFakeRequest()
      );

      const chatModel = await inference.getChatModel({
        connectorId: resolvedConnectorId,
        request: context.contextManager.getFakeRequest(),
        chatModelOptions: { temperature: 0, maxRetries: 0 },
      });

      const contextText = buildContextText(context.input);
      const modelInput = [
        { role: 'system' as const, content: GUARDRAIL_SYSTEM_PROMPT },
        { role: 'user' as const, content: contextText },
      ];

      const runnable = chatModel.withStructuredOutput(
        {
          type: 'object',
          properties: {
            pass: { type: 'boolean' },
            reason: { type: 'string' },
          },
          required: ['pass'],
        },
        { name: 'guardrail_eval', includeRaw: true, method: 'jsonMode' as const }
      );

      const result = await runnable.invoke(modelInput, { signal: context.abortSignal });
      const parsed = result.parsed as { pass?: boolean; reason?: string };
      const pass = parsed?.pass === true;
      const reason = typeof parsed?.reason === 'string' ? parsed.reason : undefined;

      if (pass) {
        return { output: { pass: true } };
      }

      return {
        output: {
          pass: false,
          reason: reason ?? 'Guardrail evaluation failed.',
          abort: true,
          abort_message: reason ?? 'Guardrail evaluation failed.',
        },
      };
    },
  });
