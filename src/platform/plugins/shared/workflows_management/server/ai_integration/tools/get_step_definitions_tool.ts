/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuiltInStepDefinition, StepCategory } from '@kbn/workflows';
import { builtInStepDefinitions } from '@kbn/workflows';
import { z } from '@kbn/zod';
import { z as zv4 } from '@kbn/zod/v4';
import { getAllConnectors } from '../../../common/schema';
import type { AgentBuilderPluginSetupContract } from '../../types';

export const GET_STEP_DEFINITIONS_TOOL_ID = 'platform.workflows.get_step_definitions';

const TOOL_TYPE_BUILTIN = 'builtin';
const TOOL_RESULT_TYPE_OTHER = 'other';

interface FormattedStepDefinition {
  id: string;
  label: string;
  description?: string;
  category: StepCategory;
  hasParams: boolean;
  jsonSchema?: unknown;
  example?: string;
}

function categorizeConnectorType(type: string): StepCategory {
  if (type.startsWith('kibana.')) return 'kibana';
  if (type.startsWith('elasticsearch.')) return 'elasticsearch';
  if (type.startsWith('ai.')) return 'ai';
  if (type.startsWith('data.')) return 'data';
  return 'external';
}

function zodToJsonSchemaSafe(schema: zv4.ZodType): unknown {
  try {
    return zv4.toJSONSchema(schema, {
      target: 'draft-7',
      unrepresentable: 'any',
    });
  } catch {
    return undefined;
  }
}

function formatBuiltInStep(step: BuiltInStepDefinition): FormattedStepDefinition {
  return {
    id: step.type,
    label: step.description,
    category: step.category,
    hasParams: true,
    jsonSchema: zodToJsonSchemaSafe(step.schema),
    example: step.example,
  };
}

function matchesSearch(search: string, ...fields: Array<string | undefined | null>): boolean {
  const term = search.toLowerCase();
  return fields.some((field) => field?.toLowerCase().includes(term));
}

/**
 * Registers the get_step_definitions tool with the Agent Builder.
 * This tool provides the LLM with information about available workflow step types
 * and their parameter schemas, including built-in flow control steps.
 */
export function registerGetStepDefinitionsTool(
  agentBuilder: AgentBuilderPluginSetupContract
): void {
  agentBuilder.tools.register({
    id: GET_STEP_DEFINITIONS_TOOL_ID,
    type: TOOL_TYPE_BUILTIN,
    description: `Get available workflow step types and their parameter schemas.
Use this tool to understand what step types are available and what parameters they accept.
This helps you generate correct YAML for workflow steps.

Supports searching by keyword to find relevant step types (e.g., search "case" to find case management steps, search "loop" or "iterate" to find foreach).
When a specific step type or small number of results is returned, detailed parameter information and usage examples are included.`,
    tags: ['workflows', 'yaml'],
    schema: z.object({
      stepType: z
        .string()
        .optional()
        .describe('Filter by exact step type ID (e.g., "http", "foreach", "kibana.createCase")'),
      search: z
        .string()
        .optional()
        .describe(
          'Search term to match against step type IDs, labels, and descriptions (e.g., "case", "slack", "loop", "alert")'
        ),
    }),
    handler: async (params) => {
      const { stepType, search } = params as { stepType?: string; search?: string };
      const allConnectors = getAllConnectors();
      const builtInTypes = new Set(builtInStepDefinitions.map((s) => s.type));

      const connectorDefinitions: FormattedStepDefinition[] = allConnectors
        .filter((connector) => !builtInTypes.has(connector.type))
        .map((connector) => ({
          id: connector.type,
          label: connector.description ?? connector.type,
          description: connector.summary ?? undefined,
          category: categorizeConnectorType(connector.type),
          hasParams: !!connector.paramsSchema,
        }));

      const builtInFormatted: FormattedStepDefinition[] =
        builtInStepDefinitions.map(formatBuiltInStep);

      let allDefinitions = [...builtInFormatted, ...connectorDefinitions];

      if (stepType) {
        allDefinitions = allDefinitions.filter((def) => def.id === stepType);
      }

      if (search) {
        allDefinitions = allDefinitions.filter((def) =>
          matchesSearch(search, def.id, def.label, def.description)
        );
      }

      if (allDefinitions.length === 0 && (stepType || search)) {
        const term = stepType || search || '';
        const suggestions = [...builtInFormatted, ...connectorDefinitions].filter((def) =>
          matchesSearch(term, def.id, def.label, def.description)
        );
        return {
          results: [
            {
              type: TOOL_RESULT_TYPE_OTHER,
              data: {
                error: stepType
                  ? `Step type "${stepType}" not found`
                  : `No step types found for search "${search}"`,
                ...(suggestions.length > 0 && {
                  suggestions: suggestions.map((s) => ({ id: s.id, label: s.label })),
                }),
                hint: 'Use the "search" parameter to find step types by keyword',
              },
            },
          ],
        };
      }

      const includeDetails = allDefinitions.length <= 5;

      const formattedResults = allDefinitions.map((def) => {
        if (!includeDetails) {
          return {
            id: def.id,
            label: def.label,
            description: def.description,
            category: def.category,
          };
        }
        return {
          id: def.id,
          label: def.label,
          description: def.description,
          category: def.category,
          ...(def.jsonSchema ? { jsonSchema: def.jsonSchema } : {}),
          example: def.example ? def.example : getStepUsageExample(def.id),
        };
      });

      return {
        results: [
          {
            type: TOOL_RESULT_TYPE_OTHER,
            data: {
              count: formattedResults.length,
              ...(search && { searchTerm: search }),
              stepTypes: formattedResults,
            },
          },
        ],
      };
    },
  });
}

function getStepUsageExample(stepType: string): string {
  const builtIn = builtInStepDefinitions.find((s) => s.type === stepType);
  if (builtIn) {
    return builtIn.example;
  }

  const examples: Record<string, string> = {
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
    'elasticsearch.request': `- name: es_request
  type: elasticsearch.request
  with:
    method: GET
    path: "/my-index/_search"
    body:
      query:
        match_all: {}`,
    'kibana.request': `- name: kibana_request
  type: kibana.request
  with:
    method: POST
    path: "/api/cases"
    body:
      title: "My case"`,
  };

  return (
    examples[stepType] ||
    `- name: ${stepType.replace(/\./g, '_')}_step
  type: ${stepType}
  with:
    # Add parameters specific to this step type`
  );
}
