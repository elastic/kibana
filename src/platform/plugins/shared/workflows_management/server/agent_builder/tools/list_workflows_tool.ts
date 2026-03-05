/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolType } from '@kbn/agent-builder-common';
import { WORKFLOWS_AI_AGENT_SETTING_ID } from '@kbn/workflows/common/constants';
import { z } from '@kbn/zod';
import type { AgentBuilderPluginSetupContract } from '../../types';
import type { WorkflowsManagementApi } from '../../workflows_management/workflows_management_api';

export const LIST_WORKFLOWS_TOOL_ID = 'platform.workflows.list_workflows';

export function registerListWorkflowsTool(
  agentBuilder: AgentBuilderPluginSetupContract,
  api: WorkflowsManagementApi
): void {
  agentBuilder.tools.register({
    id: LIST_WORKFLOWS_TOOL_ID,
    type: ToolType.builtin,
    description: `List workflows in the user's environment.

**When to use:** To find workflow IDs for \`workflow.execute\` steps, or to discover existing workflows for pattern reuse.
**When NOT to use:** To get the full YAML of a specific workflow (use get_workflow instead).

Returns workflow summaries: id, name, description, tags, enabled status.`,
    schema: z.object({
      query: z
        .string()
        .optional()
        .describe('Search query to filter workflows by name or description'),
      enabled: z.boolean().optional().describe('Filter by enabled/disabled status'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
      size: z.number().optional().describe('Maximum number of workflows to return (default: 20)'),
    }),
    tags: ['workflows'],
    availability: {
      handler: async ({ uiSettings }) => {
        const isEnabled = await uiSettings.get<boolean>(WORKFLOWS_AI_AGENT_SETTING_ID);
        return isEnabled
          ? { status: 'available' }
          : { status: 'unavailable', reason: 'AI workflow authoring is disabled' };
      },
      cacheMode: 'global',
    },
    handler: async ({ query, enabled, tags, size }, { spaceId }) => {
      const result = await api.getWorkflows(
        {
          size: size ?? 20,
          page: 1,
          ...(query && { query }),
          ...(enabled !== undefined && { enabled: [enabled] }),
          ...(tags && { tags }),
        },
        spaceId
      );

      const workflows = result.results.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        tags: w.tags,
        enabled: w.enabled,
      }));

      return {
        results: [
          {
            type: 'other' as const,
            data: {
              count: workflows.length,
              total: result.total,
              workflows,
            },
          },
        ],
      };
    },
  });
}
