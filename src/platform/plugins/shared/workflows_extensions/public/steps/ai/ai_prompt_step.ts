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
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import {
  AiPromptOutputSchema,
  AiPromptStepCommonDefinition,
  AiPromptStepTypeId,
  getStructuredOutputSchema,
} from '../../../common/steps/ai';
import { ActionsMenuGroup, createPublicStepDefinition } from '../../step_registry/types';

export const AiPromptStepDefinition = createPublicStepDefinition({
  ...AiPromptStepCommonDefinition,
  editorHandlers: {
    dynamicSchema: {
      getOutputSchema: ({ input }) => {
        if (!input.schema) {
          return AiPromptOutputSchema;
        }

        const zodSchema = fromJSONSchema(input.schema);

        if (!zodSchema) {
          return AiPromptOutputSchema;
        }

        return getStructuredOutputSchema(zodSchema);
      },
    },
  },
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/sparkles').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.translate('workflowsExtensionsExample.AiPromptStep.label', {
    defaultMessage: 'AI Prompt',
  }),
  description: i18n.translate('workflowsExtensionsExample.AiPromptStep.description', {
    defaultMessage: 'Sends a prompt to an AI connector and returns the response',
  }),
  actionsMenuGroup: ActionsMenuGroup.ai,
  documentation: {
    details: i18n.translate('workflowsExtensionsExample.AiPromptStep.documentation.details', {
      defaultMessage: `The ${AiPromptStepTypeId} step sends a prompt to an AI connector and returns the response. The response can be referenced in later steps using template syntax like {templateSyntax}.`,
      values: { templateSyntax: '`{{ steps.stepName.output }}`' }, // Needs to be extracted so it is not interpreted as a variable by the i18n plugin
    }),
    examples: [
      `## Basic AI prompt
\`\`\`yaml
- name: ask_ai
  type: ${AiPromptStepTypeId}
  with:
    prompt: "What is the weather like today?"
\`\`\`
The default AI connector configured for the workflow will be used.`,
      `## AI prompt with dynamic input
\`\`\`yaml
- name: analyze_data
  type: ${AiPromptStepTypeId}
  connector-id: ai_connector
  with:
    prompt: "Analyze this data: {{ steps.previous_step.output }}"
\`\`\``,

      `## AI prompt with structured output schema. 
Output schema must be a valid JSON Schema object.
See this [JSON Schema reference](https://json-schema.org/learn/getting-started-step-by-step) for details.
\`\`\`yaml
- name: extract_info
  type: ${AiPromptStepTypeId}
  connector-id: my-ai-connector
  with:
    prompt: "Extract key information from this text: {{ workflow.input }}"
    schema:
      type: "object"
      properties:
        summary:
          type: "string"
        key_points:
          type: "array"
          items:
            type: "string"
\`\`\``,

      `## AI prompt with structured output schema (JSON object syntax)
See this [JSON Schema reference](https://json-schema.org/learn/getting-started-step-by-step) for details.
\`\`\`yaml
- name: extract_info
  type: ${AiPromptStepTypeId}
  connector-id: my-ai-connector
  with:
    prompt: "Extract key information from this text: {{ workflow.input }}"
    schema: {
      "type":"object",
      "properties":{
        "summary":{
          "type":"string"
        },
        "key_points":{
          "type":"array",
          "items":{
            "type":"string"
          }
        }
      }
\`\`\``,

      `## Use AI response in subsequent steps
\`\`\`yaml
- name: get_recommendation
  type: ${AiPromptStepTypeId}
  connector-id: "my-ai-connector"
  with:
    prompt: "Provide a recommendation based on this data"
- name: process_recommendation
  type: http
  with:
    url: "https://api.example.com/process"
    body: "{{ steps.get_recommendation.output }}"
\`\`\``,
    ],
  },
});
