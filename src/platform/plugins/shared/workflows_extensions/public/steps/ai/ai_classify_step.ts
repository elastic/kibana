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
import {
  AiClassifyStepCommonDefinition,
  AiClassifyStepTypeId,
  buildStructuredOutputSchema,
} from '../../../common/steps/ai';
import { ActionsMenuGroup, createPublicStepDefinition } from '../../step_registry/types';

export const AiClassifyStepDefinition = createPublicStepDefinition({
  ...AiClassifyStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/sparkles').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.translate('workflowsExtensionsExample.AiClassifyStep.label', {
    defaultMessage: 'AI Classify',
  }),
  description: i18n.translate('workflowsExtensionsExample.AiClassifyStep.description', {
    defaultMessage: 'Categorizes data into predefined categories using AI',
  }),
  actionsMenuGroup: ActionsMenuGroup.ai,
  documentation: {
    details: i18n.translate('workflowsExtensionsExample.AiClassifyStep.documentation.details', {
      defaultMessage: `The ${AiClassifyStepTypeId} step categorizes input data into predefined categories using an AI connector. The classification result can be referenced in later steps using template syntax.`,
      values: { templateSyntax: '`{{ steps.stepName.output }}`' },
    }),
    examples: [
      `## Basic Classification
\`\`\`yaml
- name: classify_alert
  type: ${AiClassifyStepTypeId}
  with:
    input: "{{ steps.fetch_alert.output }}"
    categories: ["Critical", "Warning", "Info"]
\`\`\`
The default AI connector configured for the workflow will be used.`,

      `## Custom Instructions
\`\`\`yaml
- name: classify_incident
  type: ${AiClassifyStepTypeId}
  with:
    input: "{{ steps.get_incident.output }}"
    categories: ["Security", "Performance", "Network", "Application"]
    instructions: "Focus on root cause type. Ignore transient issues."
\`\`\``,

      `## Fallback Category
\`\`\`yaml
- name: classify_log
  type: ${AiClassifyStepTypeId}
  with:
    input: "{{ steps.get_log.output }}"
    categories: ["Authentication", "Authorization", "Data Access"]
    fallbackCategory: "Unknown"
\`\`\`
When the model cannot confidently match input to defined categories, the fallback category is used.`,

      `## Multi-label Classification with Rationale
\`\`\`yaml
- name: tag_alert
  type: ${AiClassifyStepTypeId}
  with:
    input: "{{ steps.alert_details.output }}"
    categories: ["High Priority", "Security", "Performance", "User Impacting"]
    allowMultipleCategories: true
    includeRationale: true
    instructions: "Select all applicable tags"
\`\`\`
When \`allowMultipleCategories\` is true, the output includes a \`categories\` array. When \`includeRationale\` is true, the output includes a \`rationale\` field.`,

      `## Custom Connector with Temperature
\`\`\`yaml
- name: classify_ticket
  type: ${AiClassifyStepTypeId}
  connector-id: "custom-classifier-model"
  with:
    input: "{{ steps.ticket_description.output }}"
    categories: ["Bug", "Feature Request", "Support"]
    temperature: 0.1
    instructions: "Prefer 'Bug' if any technical issue mentioned"
\`\`\``,

      `## Use classification in subsequent steps
\`\`\`yaml
- name: classify_severity
  type: ${AiClassifyStepTypeId}
  with:
    input: "{{ steps.get_incident_details.output }}"
    categories: ["Critical", "High", "Medium", "Low"]
    includeRationale: true
- name: notify_team
  type: http
  with:
    url: "https://api.example.com/notify"
    body: 
      severity: "{{ steps.classify_severity.output.category }}"
      reason: "{{ steps.classify_severity.output.rationale }}"
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
    dynamicSchema: {
      getOutputSchema: ({ input }) => buildStructuredOutputSchema(input),
    },
  },
});
