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

export const GET_CONNECTORS_TOOL_ID = 'platform.workflows.get_connectors';

export function registerGetConnectorsTool(
  agentBuilder: AgentBuilderPluginSetupContract,
  api: WorkflowsManagementApi
): void {
  agentBuilder.tools.register({
    id: GET_CONNECTORS_TOOL_ID,
    type: ToolType.builtin,
    description: `Get connector instances configured in the user's environment.

**When to use:** To find connector IDs needed for the \`connector-id\` field in workflow steps (e.g., which Slack or Jira connectors are available).
**When NOT to use:** To discover step types and their schemas (use get_step_definitions instead).

Returns connector instances with their ID, name, and type. The connector ID is what you put in the \`connector-id\` field of a workflow step.`,
    schema: z.object({
      connectorType: z
        .string()
        .optional()
        .describe('Filter by connector type (e.g., ".slack", ".jira", ".webhook")'),
      search: z.string().optional().describe('Search term to match against connector names'),
    }),
    tags: ['workflows', 'connectors'],
    availability: {
      handler: async ({ uiSettings }) => {
        const isEnabled = await uiSettings.get<boolean>(WORKFLOWS_AI_AGENT_SETTING_ID);
        return isEnabled
          ? { status: 'available' }
          : { status: 'unavailable', reason: 'AI workflow authoring is disabled' };
      },
      cacheMode: 'space',
    },
    handler: async ({ connectorType, search }, { spaceId, request }) => {
      const { connectorsByType, totalConnectors } = await api.getAvailableConnectors(
        spaceId,
        request
      );

      let connectors = Object.entries(connectorsByType).flatMap(([type, typeInfo]) =>
        (typeInfo.instances ?? []).map((instance) => ({
          id: instance.id,
          name: instance.name,
          type,
        }))
      );

      if (connectorType) {
        connectors = connectors.filter((c) => c.type === connectorType);
      }

      if (search) {
        const term = search.toLowerCase();
        connectors = connectors.filter(
          (c) => c.name.toLowerCase().includes(term) || c.type.toLowerCase().includes(term)
        );
      }

      return {
        results: [
          {
            type: 'other' as const,
            data: {
              count: connectors.length,
              totalAvailable: totalConnectors,
              connectors,
            },
          },
        ],
      };
    },
  });
}
