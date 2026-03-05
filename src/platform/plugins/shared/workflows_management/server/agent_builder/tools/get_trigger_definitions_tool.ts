/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolType } from '@kbn/agent-builder-common';
import { builtInTriggerDefinitions } from '@kbn/workflows';
import { WORKFLOWS_AI_AGENT_SETTING_ID } from '@kbn/workflows/common/constants';
import { z } from '@kbn/zod/v4';
import type { AgentBuilderPluginSetupContract } from '../../types';

export const GET_TRIGGER_DEFINITIONS_TOOL_ID = 'platform.workflows.get_trigger_definitions';

function zodToJsonSchemaSafe(schema: z.ZodType): unknown {
  try {
    return z.toJSONSchema(schema, { target: 'draft-7', unrepresentable: 'any' });
  } catch {
    return undefined;
  }
}

export function registerGetTriggerDefinitionsTool(
  agentBuilder: AgentBuilderPluginSetupContract
): void {
  agentBuilder.tools.register({
    id: GET_TRIGGER_DEFINITIONS_TOOL_ID,
    type: ToolType.builtin,
    description: `Get available workflow trigger types with schemas and YAML examples.

**When to use:** To learn how to configure the \`triggers\` section of a workflow.
**When NOT to use:** For step definitions (use get_step_definitions) or connector instances (use get_connectors).

Returns built-in trigger types (manual, scheduled, alert) plus any custom triggers registered by plugins.`,
    schema: z.object({
      triggerType: z
        .string()
        .optional()
        .describe('Filter by exact trigger type (e.g., "manual", "scheduled", "alert")'),
    }),
    tags: ['workflows', 'yaml', 'triggers'],
    availability: {
      handler: async ({ uiSettings }) => {
        const isEnabled = await uiSettings.get<boolean>(WORKFLOWS_AI_AGENT_SETTING_ID);
        return isEnabled
          ? { status: 'available' }
          : { status: 'unavailable', reason: 'AI workflow authoring is disabled' };
      },
      cacheMode: 'space',
    },
    handler: async ({ triggerType }) => {
      let definitions = builtInTriggerDefinitions.map((def) => ({
        id: def.id,
        label: def.label,
        description: def.description,
        jsonSchema: zodToJsonSchemaSafe(def.schema),
        examples: def.documentation.examples,
      }));

      if (triggerType) {
        definitions = definitions.filter((def) => def.id === triggerType);
      }

      if (definitions.length === 0 && triggerType) {
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                error: `Trigger type "${triggerType}" not found`,
                availableTypes: builtInTriggerDefinitions.map((d) => d.id),
              },
            },
          ],
        };
      }

      return {
        results: [
          {
            type: 'other' as const,
            data: {
              count: definitions.length,
              triggerTypes: definitions,
            },
          },
        ],
      };
    },
  });
}
