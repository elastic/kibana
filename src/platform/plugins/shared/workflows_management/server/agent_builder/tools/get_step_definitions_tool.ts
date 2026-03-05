/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { BaseStepDefinition, ConnectorContractUnion, StepParamSummary } from '@kbn/workflows';
import {
  buildBuiltInStepSchema,
  buildConnectorStepSchema,
  buildStepParamsSummary,
  builtInStepDefinitions,
  StepCategories,
  StepCategory,
} from '@kbn/workflows';
import { WORKFLOWS_AI_AGENT_SETTING_ID } from '@kbn/workflows/common/constants';
import { z } from '@kbn/zod';
import { z as zv4 } from '@kbn/zod/v4';
import { getAllConnectors } from '../../../common/schema';
import type { AgentBuilderPluginSetupContract } from '../../types';

export const GET_STEP_DEFINITIONS_TOOL_ID = 'platform.workflows.get_step_definitions';

interface StepDefinitionForAgent {
  id: string;
  label: string;
  description?: string;
  category: StepCategory;
  connectorId?: 'required' | 'optional' | 'none';
  inputParams?: StepParamSummary[];
  configParams?: StepParamSummary[];
  examples?: string[];
  stepSchema?: unknown;
}

function categorizeConnectorType(type: string): StepCategory {
  if (type.startsWith('kibana.') || type.startsWith('cases.')) return StepCategory.Kibana;
  if (type.startsWith('elasticsearch.')) return StepCategory.Elasticsearch;
  if (type.startsWith('ai.')) return StepCategory.Ai;
  if (type.startsWith('data.')) return StepCategory.Data;
  return StepCategory.External;
}

function zodToJsonSchemaSafe(schema: zv4.ZodType): unknown {
  try {
    return zv4.toJSONSchema(schema, {
      target: 'draft-7',
      unrepresentable: 'any',
      reused: 'ref',
    });
  } catch {
    return undefined;
  }
}

function formatBuiltInStep(step: BaseStepDefinition): StepDefinitionForAgent {
  const inputParams = buildStepParamsSummary(step.inputSchema);
  const configParams = step.configSchema ? buildStepParamsSummary(step.configSchema) : undefined;

  return {
    id: step.id,
    label: step.label,
    description: step.description,
    category: step.category,
    connectorId: 'none',
    ...(inputParams.length > 0 ? { inputParams } : {}),
    ...(configParams && configParams.length > 0 ? { configParams } : {}),
    examples: step.documentation?.examples,
  };
}

function formatConnectorStep(connector: ConnectorContractUnion): StepDefinitionForAgent {
  const connectorId = connector.hasConnectorId || 'none';
  const inputParams = buildStepParamsSummary(connector.paramsSchema);
  const configParams = connector.configSchema
    ? buildStepParamsSummary(connector.configSchema)
    : undefined;

  return {
    id: connector.type,
    label: connector.summary ?? connector.description ?? connector.type,
    description: truncateDescription(connector.description),
    category: categorizeConnectorType(connector.type),
    connectorId,
    ...(inputParams.length > 0 ? { inputParams } : {}),
    ...(configParams && configParams.length > 0 ? { configParams } : {}),
    examples: connector.examples?.snippet ? [connector.examples.snippet] : undefined,
  };
}

const MAX_DESCRIPTION_LENGTH = 200;

function truncateDescription(text: string | null | undefined): string | undefined {
  if (!text) return undefined;
  if (text.length <= MAX_DESCRIPTION_LENGTH) return text;
  return `${text.slice(0, MAX_DESCRIPTION_LENGTH)}...`;
}

function matchesSearch(search: string, ...fields: Array<string | undefined | null>): boolean {
  const term = search.toLowerCase();
  return fields.some((field) => field?.toLowerCase().includes(term));
}

export function registerGetStepDefinitionsTool(
  agentBuilder: AgentBuilderPluginSetupContract
): void {
  agentBuilder.tools.register({
    id: GET_STEP_DEFINITIONS_TOOL_ID,
    type: ToolType.builtin,
    description: `Get available workflow step types, their parameters, and usage examples.

**When to use:** Before generating step YAML, to discover available step types, their input params (\`with\` block), config params (step-level fields like \`connector-id\`), and usage examples.
**When NOT to use:** To find connector instances configured in the environment (use get_connectors instead).

Supports filtering by exact step type, keyword search, or category.
When a small number of results is returned, input/config parameter summaries and usage examples are included.
Common step properties (name, type, if, timeout, on-failure) are NOT listed per step -- they apply to all steps (see skill prompt).
Set includeFullSchema=true to get the full JSON Schema for input params (use sparingly -- only when examples are insufficient).`,
    schema: z.object({
      stepType: z
        .string()
        .optional()
        .describe('Filter by exact step type ID (e.g., "http", "foreach", "kibana.createCase")'),
      search: z
        .string()
        .optional()
        .describe(
          'Search term to match against step type IDs, labels, and descriptions (e.g., "case", "slack", "loop")'
        ),
      category: z
        .enum(StepCategories as [StepCategory, ...StepCategory[]])
        .optional()
        .describe('Filter by step category'),
      includeFullSchema: z
        .boolean()
        .optional()
        .describe(
          'When true, include the full JSON Schema for step input params. Use sparingly -- the compact summary and examples are usually sufficient.'
        ),
    }),
    tags: ['workflows', 'yaml', 'steps'],
    availability: {
      handler: async ({ uiSettings }) => {
        const isEnabled = await uiSettings.get<boolean>(WORKFLOWS_AI_AGENT_SETTING_ID);
        return isEnabled
          ? { status: 'available' }
          : { status: 'unavailable', reason: 'AI workflow authoring is disabled' };
      },
      cacheMode: 'space',
    },
    handler: async ({ stepType, search, category, includeFullSchema }) => {
      const builtInTypes = new Set(builtInStepDefinitions.map((s) => s.id));
      const allConnectors = getAllConnectors();

      const connectorDefinitions = allConnectors
        .filter((connector) => !builtInTypes.has(connector.type))
        .map(formatConnectorStep);
      const builtInFormatted = builtInStepDefinitions.map(formatBuiltInStep);

      let allDefinitions: StepDefinitionForAgent[] = [...builtInFormatted, ...connectorDefinitions];

      if (stepType) {
        allDefinitions = allDefinitions.filter((def) => def.id === stepType);
      }

      if (search) {
        allDefinitions = allDefinitions.filter((def) =>
          matchesSearch(search, def.id, def.label, def.description)
        );
      }

      if (category) {
        allDefinitions = allDefinitions.filter((def) => def.category === category);
      }

      if (allDefinitions.length === 0 && (stepType || search)) {
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                error: stepType
                  ? `Step type "${stepType}" not found`
                  : `No step types found for search "${search}"`,
                hint: 'Use the "search" parameter to find step types by keyword',
              },
            },
          ],
        };
      }

      const includeDetails = allDefinitions.length <= 5;

      const formattedResults = allDefinitions.map((def) => {
        if (!includeDetails) {
          return { id: def.id, label: def.label, category: def.category };
        }

        const result: Record<string, unknown> = {
          id: def.id,
          label: def.label,
          description: def.description,
          category: def.category,
        };

        if (def.connectorId && def.connectorId !== 'none') {
          result.connectorId = def.connectorId;
        }
        if (def.examples) {
          result.examples = def.examples;
        }
        if (def.inputParams && def.inputParams.length > 0) {
          result.inputParams = def.inputParams;
        }
        if (def.configParams && def.configParams.length > 0) {
          result.configParams = def.configParams;
        }

        if (includeFullSchema) {
          const fullStep = getFullSchemaForStep(def.id);
          if (fullStep) {
            result.stepSchema = fullStep.stepSchema;
          }
        }

        return result;
      });

      return {
        results: [
          {
            type: 'other' as const,
            data: {
              count: formattedResults.length,
              ...(search && { searchTerm: search }),
              stepTypes: formattedResults,
            },
          },
        ],
      };

      function getFullSchemaForStep(id: string): { stepSchema: unknown } | undefined {
        const builtIn = builtInStepDefinitions.find((s) => s.id === id);
        if (builtIn) {
          return { stepSchema: zodToJsonSchemaSafe(buildBuiltInStepSchema(builtIn)) };
        }
        const connector = allConnectors.find((c) => c.type === id);
        if (connector) {
          return { stepSchema: zodToJsonSchemaSafe(buildConnectorStepSchema(connector)) };
        }
        return undefined;
      }
    },
  });
}
