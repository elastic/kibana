/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolType } from '@kbn/agent-builder-common';
import { getWorkflowExamples, WORKFLOW_EXAMPLE_IDS } from '@kbn/workflows';
import { WORKFLOWS_AI_AGENT_SETTING_ID } from '@kbn/workflows/common/constants';
import { loadWorkflowExampleContent } from '@kbn/workflows/server';
import { z } from '@kbn/zod/v4';
import type { AgentBuilderPluginSetupContract } from '../../types';

export const GET_EXAMPLES_TOOL_ID = 'platform.workflows.get_examples';

export function registerGetExamplesTool(agentBuilder: AgentBuilderPluginSetupContract): void {
  agentBuilder.tools.register({
    id: GET_EXAMPLES_TOOL_ID,
    type: ToolType.builtin,
    description: `Search and retrieve example workflow YAML files from the bundled library.

**When to use:** Before generating workflow YAML, to learn correct syntax patterns for triggers, steps, inputs, on-failure handling, etc.
**When NOT to use:** To find workflows in the user's environment (use list_workflows instead).

Available categories: security, integrations, examples, utilities, search.
Supports keyword search across names, descriptions, and tags.`,
    schema: z.object({
      category: z
        .string()
        .optional()
        .describe('Filter by category (e.g., "security", "integrations", "examples")'),
      search: z
        .string()
        .optional()
        .describe(
          'Search term to find in example names, descriptions, or tags (e.g., "parallel", "alert", "slack")'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of examples to return (default: 3, max: 5)'),
    }),
    tags: ['workflows', 'yaml', 'examples'],
    availability: {
      handler: async ({ uiSettings }) => {
        const isEnabled = await uiSettings.get<boolean>(WORKFLOWS_AI_AGENT_SETTING_ID);
        return isEnabled
          ? { status: 'available' }
          : { status: 'unavailable', reason: 'AI workflow authoring is disabled' };
      },
      cacheMode: 'space',
    },
    handler: async ({ category, search, limit }) => {
      const effectiveLimit = Math.min(limit ?? 3, 5);
      const entries = getWorkflowExamples({ category, search });

      const examples = entries.slice(0, effectiveLimit).map((entry) => {
        if (!WORKFLOW_EXAMPLE_IDS.has(entry.id)) {
          return { id: entry.id, name: entry.name, category: entry.category };
        }
        const yaml = loadWorkflowExampleContent(entry);
        return {
          id: entry.id,
          name: entry.name,
          category: entry.category,
          ...(yaml ? { yaml } : {}),
        };
      });

      return {
        results: [
          {
            type: 'other' as const,
            data: {
              count: examples.length,
              totalAvailable: entries.length,
              ...(search && { searchTerm: search }),
              examples,
            },
          },
        ],
      };
    },
  });
}
