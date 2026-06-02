/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolType } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { z } from '@kbn/zod/v4';
import { workflowTools } from '../../../common/agent_builder/constants';
import { lookupTriggerDefinitionsForAgent } from '../../../common/build_trigger_definitions_for_agent';
import type { WorkflowsManagementApi } from '../../api/workflows_management_api';
import type { AgentBuilderPluginSetupContract } from '../../types';

type GetRegisteredTriggersApi = Pick<WorkflowsManagementApi, 'getRegisteredTriggers'>;

export function registerGetTriggerDefinitionsTool(
  agentBuilder: AgentBuilderPluginSetupContract,
  api: GetRegisteredTriggersApi
): void {
  agentBuilder.tools.register({
    id: workflowTools.getTriggerDefinitions,
    type: ToolType.builtin,
    description: `Get available workflow trigger types with schemas and YAML examples.

**When to use:** To learn how to configure the \`triggers\` section of a workflow, or to understand what \`{{ event.* }}\` variables are available at runtime for a given trigger type.
**When NOT to use:** For step definitions (use get_step_definitions) or connector instances (use get_connectors).

Returns built-in trigger types (manual, scheduled, alert) plus event-driven triggers (e.g. cases.caseUpdated) including the event context schema that describes what \`{{ event.* }}\` contains at runtime.`,
    schema: z.object({
      triggerType: z
        .string()
        .optional()
        .describe(
          'Filter by exact trigger type (e.g., "manual", "scheduled", "alert", "workflows.failed", "cases.caseUpdated")'
        ),
    }),
    tags: ['workflows', 'yaml', 'triggers'],
    availability: {
      handler: async ({ uiSettings }) => {
        const isEnabled = await uiSettings.get<boolean>(
          AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID
        );
        return isEnabled
          ? { status: 'available' }
          : { status: 'unavailable', reason: 'AI workflow authoring is disabled' };
      },
      cacheMode: 'space',
    },
    handler: async ({ triggerType }) => ({
      results: [
        {
          type: 'other' as const,
          data: lookupTriggerDefinitionsForAgent({
            registeredTriggers: await api.getRegisteredTriggers(),
            triggerType,
          }),
        },
      ],
    }),
  });
}
