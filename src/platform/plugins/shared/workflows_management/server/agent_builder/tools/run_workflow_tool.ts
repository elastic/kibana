/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { workflowTools } from '../../../common/agent_builder/constants';
import type { WorkflowsManagementApi } from '../../api/workflows_management_api';
import type { AgentBuilderPluginSetupContract } from '../../types';

export function registerRunWorkflowTool(
  agentBuilder: AgentBuilderPluginSetupContract,
  api: WorkflowsManagementApi
): void {
  agentBuilder.tools.register({
    id: workflowTools.runWorkflow,
    type: ToolType.builtin,
    description: `Execute an Elastic Workflow and return the resulting workflowExecutionId.

**When to use:**
- Pass \`workflowId\` to run a previously deployed workflow.
- Pass \`yaml\` (without \`workflowId\`) to run an unsaved draft (test execution). The YAML is validated server-side first; if invalid, the tool returns the diagnostics and does not execute.

**When NOT to use:** To save / persist a workflow — use \`deploy_workflow\` for that.

After execution starts, use the \`${platformCoreTools.getWorkflowExecutionStatus}\` tool with the returned \`workflowExecutionId\` to poll for status and final output.`,
    schema: z
      .object({
        workflowId: z
          .string()
          .optional()
          .describe('ID of a deployed workflow to execute. Mutually exclusive with `yaml`.'),
        yaml: z
          .string()
          .optional()
          .describe(
            'Inline workflow YAML to execute as an unsaved draft. Mutually exclusive with `workflowId`.'
          ),
        inputs: z
          .record(z.string(), z.any())
          .optional()
          .describe('Optional key-value inputs for the workflow execution.'),
      })
      .refine((value) => Boolean(value.workflowId) !== Boolean(value.yaml), {
        message: 'Provide exactly one of `workflowId` or `yaml`.',
      }),
    tags: ['workflows', 'lifecycle', 'execution'],
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
    handler: async ({ workflowId, yaml, inputs }, { spaceId, request }) => {
      const resolvedInputs = inputs ?? {};

      if (yaml) {
        const workflowExecutionId = await api.testWorkflow({
          workflowYaml: yaml,
          workflowId,
          inputs: resolvedInputs,
          spaceId,
          request,
        });
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                workflowExecutionId,
                isTestRun: true,
                hint: `Use ${platformCoreTools.getWorkflowExecutionStatus} with executionId="${workflowExecutionId}" to check status.`,
              },
            },
          ],
        };
      }

      if (!workflowId) {
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                executed: false,
                reason: 'missing_arguments',
                message: 'Provide either workflowId or yaml.',
              },
            },
          ],
        };
      }

      const workflow = await api.getWorkflow(workflowId, spaceId);
      if (!workflow) {
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                executed: false,
                reason: 'workflow_not_found',
                workflowId,
              },
            },
          ],
        };
      }

      if (!workflow.valid) {
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                executed: false,
                reason: 'workflow_invalid',
                workflowId,
              },
            },
          ],
        };
      }

      if (!workflow.enabled) {
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                executed: false,
                reason: 'workflow_disabled',
                workflowId,
                hint: 'Update the workflow to set `enabled: true` before running.',
              },
            },
          ],
        };
      }

      if (!workflow.definition) {
        return {
          results: [
            {
              type: 'other' as const,
              data: {
                executed: false,
                reason: 'workflow_definition_missing',
                workflowId,
              },
            },
          ],
        };
      }

      const workflowForExecution: WorkflowExecutionEngineModel = {
        id: workflow.id,
        name: workflow.name,
        enabled: workflow.enabled,
        definition: workflow.definition,
        yaml: workflow.yaml,
      };

      const workflowExecutionId = await api.runWorkflow(
        workflowForExecution,
        spaceId,
        resolvedInputs,
        request
      );

      return {
        results: [
          {
            type: 'other' as const,
            data: {
              workflowExecutionId,
              workflowId,
              hint: `Use ${platformCoreTools.getWorkflowExecutionStatus} with executionId="${workflowExecutionId}" to check status.`,
            },
          },
        ],
      };
    },
  });
}
