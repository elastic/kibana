/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';

/**
 * Step type ID for the AI guardrails step.
 */
export const AiGuardrailsStepTypeId = 'ai.guardrails';

export const ConfigSchema = z.object({
  'connector-id': z.string().optional(),
});

const ConversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']).optional(),
  content: z.string(),
});

/**
 * Input schema: agent context (message, conversation history, attachments).
 */
export const InputSchema = z.object({
  message: z.string().describe('The current user message to evaluate.'),
  conversation_history: z
    .array(ConversationMessageSchema)
    .optional()
    .describe('Optional conversation history for context-aware evaluation.'),
  attachments: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.string(),
        data: z.record(z.string(), z.any()),
        hidden: z.boolean().optional(),
      })
    )
    .optional()
    .describe('Optional attachments to include in guardrail evaluation.'),
});

/**
 * Output schema: pass/fail and optional reason; optional abort fields for before-agent hooks.
 */
export const OutputSchema = z.object({
  pass: z.boolean().describe('True if guardrails passed, false if evaluation failed.'),
  reason: z.string().optional().describe('When pass is false, explains why the guardrail failed.'),
  abort: z
    .boolean()
    .optional()
    .describe('When true and used in a guardrail workflow, the before-agent hook will abort.'),
  abort_message: z
    .string()
    .optional()
    .describe('Message shown when the workflow aborts agent execution.'),
});

export type AiGuardrailsStepConfigSchema = typeof ConfigSchema;
export type AiGuardrailsStepInputSchema = typeof InputSchema;
export type AiGuardrailsStepOutputSchema = typeof OutputSchema;

/**
 * Common step definition for the AI guardrails step.
 */
export const AiGuardrailsStepCommonDefinition: CommonStepDefinition<
  AiGuardrailsStepInputSchema,
  AiGuardrailsStepOutputSchema,
  AiGuardrailsStepConfigSchema
> = {
  id: AiGuardrailsStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('workflowsExtensionsExample.AiGuardrailsStep.label', {
    defaultMessage: 'AI Guardrails',
  }),
  description: i18n.translate('workflowsExtensionsExample.AiGuardrailsStep.description', {
    defaultMessage:
      'Evaluates agent context (message, conversation history, attachments) using an AI model with a hardcoded guardrail prompt. Returns pass/fail and reason; integrates with before-agent workflows to abort when guardrails fail.',
  }),
  documentation: {
    details: i18n.translate('workflowsExtensionsExample.AiGuardrailsStep.documentation.details', {
      defaultMessage: `The ${AiGuardrailsStepTypeId} step calls an AI connector with a fixed guardrail evaluation prompt. The current message and optional conversation history and attachments are sent as context. The model returns pass or fail with a reason. In before-agent workflows, a failed result can abort execution via abort and abort_message. The result can be referenced in later steps using {templateSyntax}.`,
      values: { templateSyntax: '`{{ steps.stepName.output }}`' },
    }),
    examples: [
      `## Basic guardrail check
\`\`\`yaml
- name: check_guardrails
  type: ${AiGuardrailsStepTypeId}
  with:
    message: "{{ workflow.input.prompt }}"
\`\`\``,
      `## With conversation history
\`\`\`yaml
- name: guardrails
  type: ${AiGuardrailsStepTypeId}
  with:
    message: "{{ workflow.input.prompt }}"
    conversation_history: "{{ workflow.input.conversation_history }}"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
