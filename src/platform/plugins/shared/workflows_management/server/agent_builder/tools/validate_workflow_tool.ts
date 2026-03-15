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
import type { AgentBuilderPluginSetupContract } from '../../types';
import type { WorkflowsManagementApi } from '../../workflows_management/workflows_management_api';

export const VALIDATE_WORKFLOW_TOOL_ID = 'platform.workflows.validate_workflow';

export function registerValidateWorkflowTool(
  agentBuilder: AgentBuilderPluginSetupContract,
  api: WorkflowsManagementApi
): void {
  agentBuilder.tools.register({
    id: VALIDATE_WORKFLOW_TOOL_ID,
    type: ToolType.builtin,
    description: `Validate a workflow YAML string against all validation rules.
Use this tool AFTER generating or modifying workflow YAML and BEFORE proposing changes to the user.
It checks YAML syntax, schema conformance, step name uniqueness, and Liquid template syntax.
If validation fails, fix the issues and re-validate until the YAML is valid.`,
    schema: z.object({
      yaml: z.string().describe('The complete workflow YAML string to validate'),
    }),
    tags: ['workflows', 'yaml', 'validation'],
    availability: {
      handler: async ({ uiSettings }) => {
        const isEnabled = await uiSettings.get<boolean>(WORKFLOWS_AI_AGENT_SETTING_ID);
        return isEnabled
          ? { status: 'available' }
          : { status: 'unavailable', reason: 'AI workflow authoring is disabled' };
      },
      cacheMode: 'space',
    },
    handler: async ({ yaml }, { spaceId, request }) => {
      const result = await api.validateWorkflow(yaml, spaceId, request);
      return {
        results: [
          {
            type: 'other' as const,
            data: { result },
          },
        ],
      };
    },
  });
}
