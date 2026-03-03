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

function buildContextText(input: {
  message: string;
  conversation_history?: Array<{ role?: string; content: string }>;
  attachments?: Array<{ type: string; data: Record<string, unknown> }>;
}): string {
  const parts: string[] = ['## Current message\n', input.message];

  if (input.conversation_history?.length) {
    parts.push('\n## Conversation history\n');
    for (const msg of input.conversation_history) {
      const role = msg.role ?? 'user';
      if (msg.content) {
        parts.push(`[${role}]: ${msg.content}\n`);
      }
    }
  }

  if (input.attachments?.length) {
    parts.push('\n## Attachments\n');
    for (const att of input.attachments) {
      if (att.data && typeof att.data === 'object') {
        try {
          parts.push(`[${att.type}]: ${JSON.stringify(att.data)}\n`);
        } catch {
          parts.push(`[${att.type}]: ${String(att.data)}\n`);
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
