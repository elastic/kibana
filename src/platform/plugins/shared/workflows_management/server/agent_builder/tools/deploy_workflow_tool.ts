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
import type { WorkflowsManagementApi } from '../../api/workflows_management_api';
import type { AgentBuilderPluginSetup } from '../../types';

export function registerDeployWorkflowTool(
  agentBuilder: AgentBuilderPluginSetup,
  api: WorkflowsManagementApi
): void {
  agentBuilder.tools.register({
    id: workflowTools.deployWorkflow,
    type: ToolType.builtin,
    description: `Create or update an Elastic Workflow from YAML.

**When to use:** After authoring or editing a workflow YAML and validating it via \`validate_workflow\`.
- Omit \`id\` to create a new workflow with a server-generated ID. The new ID is returned.
- Pass \`id\` to upsert: if a workflow with that ID exists it is updated in place, otherwise a new workflow is created with that ID.

**When NOT to use:** Do not call this tool to test an unsaved draft — use \`run_workflow\` with the inline \`yaml\` parameter instead.

The YAML is validated server-side before being persisted; if validation fails, the tool returns the validation diagnostics and does not write anything.`,
    schema: z.object({
      yaml: z.string().describe('The complete workflow YAML string to deploy.'),
      id: z
        .string()
        .optional()
        .describe(
          'Workflow ID. If provided and the workflow exists, it is updated in place. If provided and no such workflow exists, a new workflow is created with this ID. If omitted, a new workflow is created with a server-generated ID.'
        ),
    }),
    tags: ['workflows', 'lifecycle'],
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
    handler: async ({ yaml, id }, { spaceId, request }) => {
      const validation = await api.validateWorkflow(yaml, spaceId, request);
      if (!validation.valid) {
        const { parsedWorkflow: _stripped, ...compactValidation } = validation;
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                deployed: false,
                reason: 'validation_failed',
                validation: compactValidation,
              },
            },
          ],
        };
      }

      if (id) {
        const existing = await api.getWorkflow(id, spaceId);
        if (existing) {
          const updateResult = await api.updateWorkflow(id, { yaml }, spaceId, request);
          return {
            results: [
              {
                type: 'other' as const,
                data: {
                  deployed: true,
                  action: 'updated',
                  id,
                  result: updateResult,
                },
              },
            ],
          };
        }

        const createdWithId = await api.createWorkflow({ yaml, id }, spaceId, request);
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                deployed: true,
                action: 'created',
                id: createdWithId.id,
                workflow: createdWithId,
              },
            },
          ],
        };
      }

      const createdWorkflow = await api.createWorkflow({ yaml }, spaceId, request);
      return {
        results: [
          {
            type: 'other' as const,
            data: {
              deployed: true,
              action: 'created',
              id: createdWorkflow.id,
              workflow: createdWorkflow,
            },
          },
        ],
      };
    },
  });
}
