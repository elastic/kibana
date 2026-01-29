/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { stepSchemas } from '../../../common/step_schemas';
import type { AgentBuilderPluginSetupContract } from '../../types';

export const GET_STEP_DEFINITIONS_TOOL_ID = 'platform.workflows.get_step_definitions';

// Tool type constant (matches ToolType.builtin from @kbn/agent-builder-common)
const TOOL_TYPE_BUILTIN = 'builtin';
// Result type constant (matches ToolResultType.other from @kbn/agent-builder-common)
const TOOL_RESULT_TYPE_OTHER = 'other';

/**
 * Registers the get_step_definitions tool with the Agent Builder.
 * This tool provides the LLM with information about available workflow step types
 * and their parameter schemas.
 */
export function registerGetStepDefinitionsTool(
  agentBuilder: AgentBuilderPluginSetupContract
): void {
  agentBuilder.tools.register({
    id: GET_STEP_DEFINITIONS_TOOL_ID,
    type: TOOL_TYPE_BUILTIN,
    description: `Get available workflow step types and their parameter schemas.
Use this tool to understand what step types are available and what parameters they accept.
This helps you generate correct YAML for workflow steps.`,
    tags: ['workflows', 'yaml'],
    schema: z.object({
      stepType: z
        .string()
        .optional()
        .describe('Filter by specific step type ID (e.g., "http", "foreach", "if")'),
    }),
    handler: async ({ stepType }) => {
      const allDefinitions = stepSchemas.getAllRegisteredStepDefinitions();

      // Format the definitions for the LLM
      const formattedDefinitions = allDefinitions
        .filter((def) => !stepType || def.id === stepType)
        .map((def) => {
          const isPublic = stepSchemas.isPublicStepDefinition(def);
          return {
            id: def.id,
            label: isPublic ? def.label : def.id,
            description: isPublic ? def.description : undefined,
            category: isPublic ? def.category : undefined,
            // Include schema information if available
            hasParams: !!def.paramsSchema,
          };
        });

      // If a specific stepType was requested and found, provide more detail
      if (stepType && formattedDefinitions.length === 1) {
        const def = allDefinitions.find((d) => d.id === stepType);
        if (def) {
          return {
            results: [
              {
                type: TOOL_RESULT_TYPE_OTHER,
                data: {
                  stepType,
                  definition: formattedDefinitions[0],
                  usage: getStepUsageExample(stepType),
                },
              },
            ],
          };
        }
      }

      return {
        results: [
          {
            type: TOOL_RESULT_TYPE_OTHER,
            data: {
              count: formattedDefinitions.length,
              stepTypes: formattedDefinitions,
              commonTypes: getCommonStepTypes(),
            },
          },
        ],
      };
    },
  });
}

/**
 * Returns usage examples for common step types
 */
function getStepUsageExample(stepType: string): string {
  const examples: Record<string, string> = {
    http: `- name: my_http_step
  type: http
  with:
    url: "https://api.example.com/endpoint"
    method: GET
    headers:
      Authorization: "Bearer {{ consts.api_key }}"`,
    foreach: `- name: loop_over_items
  type: foreach
  foreach: "{{ steps.previous_step.output.items | json }}"
  steps:
    - name: process_item
      type: console
      with:
        message: "Processing: {{ foreach.item }}"`,
    if: `- name: check_condition
  type: if
  condition: "steps.previous_step.output.status : 'success'"
  steps:
    - name: on_success
      type: console
      with:
        message: "Success!"
  else:
    - name: on_failure
      type: console
      with:
        message: "Failed!"`,
    'data.set': `- name: set_variable
  type: data.set
  with:
    key: my_variable
    value: "{{ steps.previous_step.output.result }}"`,
    console: `- name: log_message
  type: console
  with:
    message: "Current value: {{ steps.previous_step.output }}"`,
    'elasticsearch.search': `- name: search_data
  type: elasticsearch.search
  with:
    index: "my-index"
    size: 10
    query:
      match:
        field: "value"`,
  };

  return (
    examples[stepType] ||
    `- name: ${stepType.replace(/\./g, '_')}_step
  type: ${stepType}
  with:
    # Add parameters specific to this step type`
  );
}

/**
 * Returns a summary of the most commonly used step types
 */
function getCommonStepTypes(): Array<{ type: string; description: string }> {
  return [
    { type: 'http', description: 'Make HTTP requests to external APIs' },
    { type: 'foreach', description: 'Loop over a collection of items' },
    { type: 'if', description: 'Conditional execution based on expressions' },
    { type: 'parallel', description: 'Execute multiple branches concurrently' },
    { type: 'data.set', description: 'Set variables in workflow context' },
    { type: 'data.transform', description: 'Transform data using expressions' },
    { type: 'wait', description: 'Pause execution for a specified duration' },
    { type: 'console', description: 'Log messages to the execution output' },
    { type: 'elasticsearch.search', description: 'Query Elasticsearch indices' },
    { type: 'elasticsearch.bulk', description: 'Bulk index documents' },
    { type: 'elasticsearch.indices.create', description: 'Create Elasticsearch index' },
    { type: 'kibana.post_agent_builder_converse', description: 'Invoke an AI agent' },
  ];
}
