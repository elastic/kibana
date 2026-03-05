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

export const GET_WORKFLOW_TOOL_ID = 'platform.workflows.get_workflow';

export function registerGetWorkflowTool(
  agentBuilder: AgentBuilderPluginSetupContract,
  api: WorkflowsManagementApi
): void {
  agentBuilder.tools.register({
    id: GET_WORKFLOW_TOOL_ID,
    type: ToolType.builtin,
    description: `Get full details of a workflow by its ID, including the complete YAML definition.

**When to use:** After listing workflows with list_workflows, to inspect a specific workflow's YAML for reference or reuse.
**When NOT to use:** To discover workflows (use list_workflows first).`,
    schema: z.object({
      workflowId: z.string().describe('The workflow ID to retrieve'),
    }),
    tags: ['workflows', 'yaml'],
    availability: {
      handler: async ({ uiSettings }) => {
        const isEnabled = await uiSettings.get<boolean>(WORKFLOWS_AI_AGENT_SETTING_ID);
        return isEnabled
          ? { status: 'available' }
          : { status: 'unavailable', reason: 'AI workflow authoring is disabled' };
      },
      cacheMode: 'space',
    },
    handler: async ({ workflowId }, { spaceId }) => {
      const workflow = await api.getWorkflow(workflowId, spaceId);

      if (!workflow) {
        return {
          results: [
            {
              type: 'other' as const,
              data: { error: `Workflow "${workflowId}" not found` },
            },
          ],
        };
      }

      return {
        results: [
          {
            type: 'other' as const,
            data: {
              id: workflow.id,
              name: workflow.name,
              description: workflow.description,
              enabled: workflow.enabled,
              yaml: workflow.yaml,
            },
          },
        ],
      };
    },
  });
}
