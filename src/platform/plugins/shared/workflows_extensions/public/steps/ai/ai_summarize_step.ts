/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { AiSummarizeStepCommonDefinition, AiSummarizeStepTypeId } from '../../../common/steps/ai';
import { ActionsMenuGroup, type PublicStepDefinition } from '../../step_registry/types';

export const AiSummarizeStepDefinition: PublicStepDefinition = {
  ...AiSummarizeStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/sparkles').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.translate('workflowsExtensionsExample.AiSummarizeStep.label', {
    defaultMessage: 'AI Summarize',
  }),
  description: i18n.translate('workflowsExtensionsExample.AiSummarizeStep.description', {
    defaultMessage: 'Generates a summary of the provided content using AI',
  }),
  actionsMenuGroup: ActionsMenuGroup.ai,
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

  editorHandlers: {
    config: {
      'connector-id': {
        connectorIdSelection: {
          connectorTypes: ['inference.unified_completion', 'bedrock', 'gen-ai', 'gemini'],
          enableCreation: false,
        },
      },
    },
  },
};
