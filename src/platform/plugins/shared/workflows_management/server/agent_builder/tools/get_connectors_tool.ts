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
import { z } from '@kbn/zod/v4';
import { workflowTools } from '../../../common/agent_builder/constants';
import type { WorkflowsManagementApi } from '../../api/workflows_management_api';
import type { AgentBuilderPluginSetupContract } from '../../types';

export function registerGetConnectorsTool(
  agentBuilder: AgentBuilderPluginSetupContract,
  api: WorkflowsManagementApi
): void {
  agentBuilder.tools.register({
    id: workflowTools.getConnectors,
    type: ToolType.builtin,
    description: `Discover available connector-backed workflow steps. Workflow steps can be executed through connectors (GitHub, Jira, Slack, HTTP, etc.).

**When to use:** ALWAYS call this first when the user wants to interact with an external service. This discovers which connector steps are available to execute.

Returns configured connector instances (ready to use with step.connector-step) and unconfigured connector types (can be set up via connect_connector).`,
    schema: z.object({
      actionTypeId: z
        .string()
        .optional()
        .describe('Filter by connector action type ID (e.g., ".slack", ".jira", ".webhook")'),
      stepType: z
        .string()
        .optional()
        .describe('Filter by workflow step type (e.g., "slack", "jira", "inference.completion")'),
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
    handler: async ({ actionTypeId, stepType, search }, context) => {
      const { spaceId, request } = context;
      const { connectorTypes, totalConnectors } = await api.getAvailableConnectors(
        spaceId,
        request
      );

      // eslint-disable-next-line no-console
      console.log(`[get-connectors] Called with actionTypeId=${actionTypeId}, stepType=${stepType}, search=${search}. Available types: ${Object.keys(connectorTypes).join(', ')}`);

      const entries = actionTypeId
        ? connectorTypes[actionTypeId]
          ? [[actionTypeId, connectorTypes[actionTypeId]] as const]
          : []
        : Object.entries(connectorTypes);

      let connectors = entries.flatMap(([type, typeInfo]) => {
        const baseStepType = type.replace(/^\./, '');
        const stepTypes =
          typeInfo.subActions?.length > 0
            ? typeInfo.subActions.map((sa) => `${baseStepType}.${sa.name}`)
            : [baseStepType];

        return (typeInfo.instances ?? []).map((instance) => ({
          id: instance.id,
          name: instance.name,
          actionTypeId: type,
          stepTypes,
        }));
      });

      if (stepType) {
        connectors = connectors.filter((c) => c.stepTypes.includes(stepType));
      }

      if (search) {
        const term = search.toLowerCase();
        connectors = connectors.filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            c.actionTypeId.toLowerCase().includes(term) ||
            c.stepTypes.some((st) => st.toLowerCase().includes(term))
        );
      }

      // Also include unconfigured connector types so the agent knows what's available to set up
      let unconfiguredTypes = entries
        .filter(([, typeInfo]) => !typeInfo.instances || typeInfo.instances.length === 0)
        .map(([type, typeInfo]) => ({
          actionTypeId: type,
          name: (typeInfo as { displayName?: string }).displayName ?? type.replace(/^\./, ''),
        }));

      if (search) {
        const term = search.toLowerCase();
        unconfiguredTypes = unconfiguredTypes.filter(
          (t) => t.name.toLowerCase().includes(term) || t.actionTypeId.toLowerCase().includes(term)
        );
      }

      // When searching and no configured connectors match but unconfigured types do, show HITL selection
      if (connectors.length === 0 && unconfiguredTypes.length > 0) {
        const promptId = 'connector-choice';

        const selection = context.prompts.checkSelectionStatus(promptId);
        if (selection.status === 'selected') {
          return {
            results: [{
              type: 'other' as const,
              data: {
                userChoice: selection.selectedOptionId,
                choiceType: selection.selectedOptionId === 'http_fallback' ? 'http' : 'dedicated',
                connectorTypeId: selection.selectedOptionId !== 'http_fallback' ? selection.selectedOptionId : undefined,
                connectorTypeName: unconfiguredTypes.find((t) => t.actionTypeId === selection.selectedOptionId)?.name,
                instruction: selection.selectedOptionId === 'http_fallback'
                  ? 'User chose generic HTTP. Use the http step to make the request.'
                  : `User chose to configure connector type "${selection.selectedOptionId}". Call connect_connector to set it up, then use step.connectorStep to execute.`,
              },
            }],
          };
        }
        if (selection.status === 'cancelled') {
          return { results: [{ type: 'other' as const, data: { cancelled: true } }] };
        }

        return context.prompts.askForSelection({
          id: promptId,
          title: 'Choose a Connector',
          message: `No configured connector found for "${search}". How would you like to proceed?`,
          options: [
            ...unconfiguredTypes.map((t) => ({
              id: t.actionTypeId,
              label: `Configure ${t.name} connector`,
              description: 'Best integration. You will be asked for credentials.',
            })),
            {
              id: 'http_fallback',
              label: 'Use generic HTTP',
              description: 'Direct HTTP request (may require authentication).',
            },
          ],
          cancel_text: 'Skip',
        });
      }

      return {
        results: [
          {
            type: 'other' as const,
            data: {
              count: connectors.length,
              totalAvailable: totalConnectors,
              connectors,
              availableButUnconfigured: unconfiguredTypes,
            },
          },
        ],
      };
    },
  });
}
