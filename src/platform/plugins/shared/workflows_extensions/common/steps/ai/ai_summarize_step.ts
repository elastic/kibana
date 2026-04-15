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
 * Step type ID for the AI summarize step.
 */
export const AiSummarizeStepTypeId = 'ai.summarize';

export const ConfigSchema = z.object({
  'connector-id': z.string().optional(),
});

/**
 * Input schema for the AI summarize step.
 */
export const InputSchema = z.object({
  input: z.union([z.string(), z.array(z.unknown()), z.record(z.string(), z.unknown())]),
  instructions: z.string().optional(),
  maxLength: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(1).optional(),
});

/**
 * Output schema for the AI summarize step.
 */
export const OutputSchema = z.object({
  content: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type AiSummarizeStepConfigSchema = typeof ConfigSchema;
export type AiSummarizeStepInputSchema = typeof InputSchema;
export type AiSummarizeStepOutputSchema = typeof OutputSchema;

/**
 * Common step definition for AI summarize step.
 * This is shared between server and public implementations.
 * Input and output types are automatically inferred from the schemas.
 */
export const AiSummarizeStepCommonDefinition: CommonStepDefinition<
  AiSummarizeStepInputSchema,
  AiSummarizeStepOutputSchema,
  AiSummarizeStepConfigSchema
> = {
  id: AiSummarizeStepTypeId,
  category: StepCategory.Ai,
  label: i18n.translate('workflowsExtensionsExample.AiSummarizeStep.label', {
    defaultMessage: 'AI Summarize',
  }),
  description: i18n.translate('workflowsExtensionsExample.AiSummarizeStep.description', {
    defaultMessage: 'Generates a summary of the provided content using AI',
  }),
  documentation: {
    details: i18n.translate('workflowsExtensionsExample.AiSummarizeStep.documentation.details', {
      defaultMessage: `The ${AiSummarizeStepTypeId} step generates a concise summary of the provided content using an AI connector. The summary can be referenced in later steps using template syntax.`,
      values: { templateSyntax: '`{{ steps.stepName.output }}`' },
    }),
    examples: [
      `## Basic Summarization
\`\`\`yaml
- name: summarize_logs
  type: ${AiSummarizeStepTypeId}
  with:
    input: "{{ steps.fetch_logs.output }}"
\`\`\`
The default AI connector configured for the workflow will be used.`,

      `## Data Summarization
\`\`\`yaml
- name: summarize_alerts
  type: ${AiSummarizeStepTypeId}
  with:
    input: "{{ steps.fetch_alerts.output }}"
\`\`\`
Supports objects and arrays as input.`,

      `## Custom Instructions
\`\`\`yaml
- name: summarize_alerts
  type: ${AiSummarizeStepTypeId}
  with:
    input: "{{ steps.get_alerts.output }}"
    instructions: "Use bullet points. Focus on root cause. Limit to 3 key points."
\`\`\``,

      `## Length Control
\`\`\`yaml
- name: summarize_for_pagerduty
  type: ${AiSummarizeStepTypeId}
  with:
    input: "{{ steps.error_details.output }}"
    maxLength: 100
    instructions: "One sentence summary suitable for alert title"
\`\`\``,

      `## Use AI summary in subsequent steps
\`\`\`yaml
- name: summarize_incident
  type: ${AiSummarizeStepTypeId}
  with:
    input: "{{ steps.get_incident_details.output }}"
    instructions: "Concise summary for notification"
- name: send_notification
  type: http
  with:
    url: "https://api.example.com/notify"
    body: "{{ steps.summarize_incident.output.content }}"
\`\`\``,
    ],
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
