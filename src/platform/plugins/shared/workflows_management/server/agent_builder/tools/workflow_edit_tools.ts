/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { WORKFLOWS_AI_AGENT_SETTING_ID } from '@kbn/workflows/common/constants';
import { z } from '@kbn/zod/v4';
import type { EditResult, StepDefinition } from './yaml_edit_utils';
import {
  deleteStep,
  insertStep,
  modifyStep,
  modifyStepProperty,
  modifyWorkflowProperty,
} from './yaml_edit_utils';
import type { AgentBuilderPluginSetupContract } from '../../types';
import type { WorkflowsManagementApi } from '../../workflows_management/workflows_management_api';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '../attachments/workflow_yaml_attachment';
import { WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE } from '../attachments/workflow_yaml_diff_attachment';

export const WORKFLOW_INSERT_STEP_TOOL_ID = 'platform.workflows.workflow_insert_step';
export const WORKFLOW_MODIFY_STEP_TOOL_ID = 'platform.workflows.workflow_modify_step';
export const WORKFLOW_MODIFY_STEP_PROPERTY_TOOL_ID =
  'platform.workflows.workflow_modify_step_property';
export const WORKFLOW_MODIFY_PROPERTY_TOOL_ID = 'platform.workflows.workflow_modify_property';
export const WORKFLOW_DELETE_STEP_TOOL_ID = 'platform.workflows.workflow_delete_step';
export const WORKFLOW_REPLACE_YAML_TOOL_ID = 'platform.workflows.workflow_replace_yaml';

const workflowEditAvailability = {
  handler: async ({ uiSettings }: { uiSettings: { get: <T>(id: string) => Promise<T> } }) => {
    const isEnabled = await uiSettings.get<boolean>(WORKFLOWS_AI_AGENT_SETTING_ID);
    return isEnabled
      ? ({ status: 'available' } as const)
      : ({ status: 'unavailable', reason: 'AI workflow authoring is disabled' } as const);
  },
  cacheMode: 'space' as const,
};

const stepDefinitionSchema = z.object({
  name: z.string(),
  type: z.string(),
  'connector-id': z.string().optional(),
  condition: z.string().optional(),
  foreach: z.string().optional(),
  with: z.record(z.string(), z.unknown()).optional(),
  output: z.record(z.string(), z.unknown()).optional(),
  steps: z.array(z.record(z.string(), z.unknown())).optional(),
});

const findWorkflowYamlAttachment = (
  context: ToolHandlerContext
): { yaml: string; attachmentId: string; workflowId?: string; name?: string } | null => {
  const activeAttachments = context.attachments.getActive();
  const yamlAttachment = activeAttachments.find((a) => a.type === WORKFLOW_YAML_ATTACHMENT_TYPE);

  if (!yamlAttachment) return null;

  const latestVersion = yamlAttachment.versions[yamlAttachment.versions.length - 1];
  if (!latestVersion) return null;

  const data = latestVersion.data as { yaml?: string; workflowId?: string; name?: string };
  if (!data?.yaml) return null;

  return {
    yaml: data.yaml,
    attachmentId: yamlAttachment.id,
    workflowId: data.workflowId,
    name: data.name,
  };
};

const noAttachmentError = () => ({
  results: [
    {
      type: 'other' as const,
      data: {
        success: false,
        error: 'No workflow YAML attachment found in the conversation',
      },
    },
  ],
});

const emitDiffAndUpdateYaml = async (
  context: ToolHandlerContext,
  attachmentId: string,
  beforeYaml: string,
  afterYaml: string,
  proposalId: string,
  description: string | undefined,
  workflowId: string | undefined,
  workflowName: string | undefined
): Promise<string> => {
  const diffAttachment = await context.attachments.add({
    type: WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
    data: {
      beforeYaml,
      afterYaml,
      proposalId,
      status: 'pending',
      workflowId,
      name: workflowName,
    },
    description: description ?? 'Proposed workflow change',
  });

  await context.attachments.update(attachmentId, {
    data: { yaml: afterYaml, workflowId, name: workflowName },
  });

  return diffAttachment.id;
};

interface CompactValidation {
  valid: boolean;
  errors?: string[];
}

const runCompactValidation = async (
  yaml: string,
  api: WorkflowsManagementApi,
  context: ToolHandlerContext
): Promise<CompactValidation | undefined> => {
  try {
    const result = await api.validateWorkflow(yaml, context.spaceId, context.request);
    if (result.valid) {
      return { valid: true };
    }
    const errors = result.diagnostics
      .filter((d) => d.severity === 'error')
      .map((d) => `[${d.source}] ${d.message}${d.path ? ` (at ${d.path.join('.')})` : ''}`);
    return { valid: false, errors };
  } catch {
    return undefined;
  }
};

const handleEditResult = async (
  result: EditResult,
  context: ToolHandlerContext,
  attachmentId: string,
  beforeYaml: string,
  proposalId: string,
  description: string | undefined,
  workflowId: string | undefined,
  workflowName: string | undefined,
  toolId: string,
  api: WorkflowsManagementApi
) => {
  if (!result.success) {
    return {
      results: [
        {
          type: 'other' as const,
          data: { success: false, error: result.error, toolId },
        },
      ],
    };
  }

  const diffAttachmentId = await emitDiffAndUpdateYaml(
    context,
    attachmentId,
    beforeYaml,
    result.yaml,
    proposalId,
    description,
    workflowId,
    workflowName
  );

  const validation = await runCompactValidation(result.yaml, api, context);

  return {
    results: [
      {
        type: 'other' as const,
        data: {
          success: true,
          proposalId,
          diffAttachmentId,
          toolId,
          description: description ?? 'Change proposed successfully',
          ...(validation ? { validation } : {}),
        },
      },
    ],
  };
};

export function registerWorkflowEditTools(
  agentBuilder: AgentBuilderPluginSetupContract,
  api: WorkflowsManagementApi
): void {
  agentBuilder.tools.register({
    id: WORKFLOW_INSERT_STEP_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Insert a new step at the end of the workflow steps list. Provide the step as a structured object. Returns a diffAttachmentId — render it in your response with <render_attachment id="{diffAttachmentId}"/> so the user sees the diff.',
    schema: z.object({
      step: stepDefinitionSchema as z.ZodType<StepDefinition>,
      proposalId: z.string().describe('A unique identifier for this proposed change'),
      description: z
        .string()
        .optional()
        .describe('Human-readable description of what the change does'),
    }),
    tags: ['workflows', 'yaml', 'edit'],
    availability: workflowEditAvailability,
    handler: async ({ step, proposalId, description }, context) => {
      const attachment = findWorkflowYamlAttachment(context);
      if (!attachment) return noAttachmentError();

      const result = insertStep(attachment.yaml, step);
      return handleEditResult(
        result,
        context,
        attachment.attachmentId,
        attachment.yaml,
        proposalId,
        description,
        attachment.workflowId,
        attachment.name,
        WORKFLOW_INSERT_STEP_TOOL_ID,
        api
      );
    },
  });

  agentBuilder.tools.register({
    id: WORKFLOW_MODIFY_STEP_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Replace an entire step by name with a new step definition. The step is identified by its name. Returns a diffAttachmentId — render it in your response with <render_attachment id="{diffAttachmentId}"/> so the user sees the diff.',
    schema: z.object({
      stepName: z.string().describe('The name of the step to replace'),
      updatedStep: stepDefinitionSchema as z.ZodType<StepDefinition>,
      proposalId: z.string().describe('A unique identifier for this proposed change'),
      description: z
        .string()
        .optional()
        .describe('Human-readable description of what the change does'),
    }),
    tags: ['workflows', 'yaml', 'edit'],
    availability: workflowEditAvailability,
    handler: async ({ stepName, updatedStep, proposalId, description }, context) => {
      const attachment = findWorkflowYamlAttachment(context);
      if (!attachment) return noAttachmentError();

      const result = modifyStep(attachment.yaml, stepName, updatedStep);
      return handleEditResult(
        result,
        context,
        attachment.attachmentId,
        attachment.yaml,
        proposalId,
        description,
        attachment.workflowId,
        attachment.name,
        WORKFLOW_MODIFY_STEP_TOOL_ID,
        api
      );
    },
  });

  agentBuilder.tools.register({
    id: WORKFLOW_MODIFY_STEP_PROPERTY_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Modify a single property of a step identified by name. Provide the property key and new value. Returns a diffAttachmentId — render it in your response with <render_attachment id="{diffAttachmentId}"/> so the user sees the diff.',
    schema: z.object({
      stepName: z.string().describe('The name of the step to modify'),
      property: z.string().describe('The property key to modify (e.g., "with", "type")'),
      value: z.unknown().describe('The new value for the property'),
      proposalId: z.string().describe('A unique identifier for this proposed change'),
      description: z
        .string()
        .optional()
        .describe('Human-readable description of what the change does'),
    }),
    tags: ['workflows', 'yaml', 'edit'],
    availability: workflowEditAvailability,
    handler: async ({ stepName, property, value, proposalId, description }, context) => {
      const attachment = findWorkflowYamlAttachment(context);
      if (!attachment) return noAttachmentError();

      const result = modifyStepProperty(attachment.yaml, stepName, property, value);
      return handleEditResult(
        result,
        context,
        attachment.attachmentId,
        attachment.yaml,
        proposalId,
        description,
        attachment.workflowId,
        attachment.name,
        WORKFLOW_MODIFY_STEP_PROPERTY_TOOL_ID,
        api
      );
    },
  });

  agentBuilder.tools.register({
    id: WORKFLOW_MODIFY_PROPERTY_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Modify a top-level workflow property (e.g. name, description, trigger). Provide the property key and new value. Returns a diffAttachmentId — render it in your response with <render_attachment id="{diffAttachmentId}"/> so the user sees the diff.',
    schema: z.object({
      property: z
        .string()
        .describe('The top-level property key to modify (e.g., "name", "description", "trigger")'),
      value: z.unknown().describe('The new value for the property'),
      proposalId: z.string().describe('A unique identifier for this proposed change'),
      description: z
        .string()
        .optional()
        .describe('Human-readable description of what the change does'),
    }),
    tags: ['workflows', 'yaml', 'edit'],
    availability: workflowEditAvailability,
    handler: async ({ property, value, proposalId, description }, context) => {
      const attachment = findWorkflowYamlAttachment(context);
      if (!attachment) return noAttachmentError();

      const result = modifyWorkflowProperty(attachment.yaml, property, value);
      return handleEditResult(
        result,
        context,
        attachment.attachmentId,
        attachment.yaml,
        proposalId,
        description,
        attachment.workflowId,
        attachment.name,
        WORKFLOW_MODIFY_PROPERTY_TOOL_ID,
        api
      );
    },
  });

  agentBuilder.tools.register({
    id: WORKFLOW_DELETE_STEP_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Delete a step from the workflow by its name. Returns a diffAttachmentId — render it in your response with <render_attachment id="{diffAttachmentId}"/> so the user sees the diff.',
    schema: z.object({
      stepName: z.string().describe('The name of the step to delete'),
      proposalId: z.string().describe('A unique identifier for this proposed change'),
      description: z
        .string()
        .optional()
        .describe('Human-readable description of what the change does'),
    }),
    tags: ['workflows', 'yaml', 'edit'],
    availability: workflowEditAvailability,
    handler: async ({ stepName, proposalId, description }, context) => {
      const attachment = findWorkflowYamlAttachment(context);
      if (!attachment) return noAttachmentError();

      const result = deleteStep(attachment.yaml, stepName);
      return handleEditResult(
        result,
        context,
        attachment.attachmentId,
        attachment.yaml,
        proposalId,
        description,
        attachment.workflowId,
        attachment.name,
        WORKFLOW_DELETE_STEP_TOOL_ID,
        api
      );
    },
  });

  agentBuilder.tools.register({
    id: WORKFLOW_REPLACE_YAML_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Replace the entire workflow YAML content. Use this for large-scale changes or when multiple properties and steps need to change at once. Returns a diffAttachmentId — render it in your response with <render_attachment id="{diffAttachmentId}"/> so the user sees the diff.',
    schema: z.object({
      yaml: z.string().describe('The complete new workflow YAML content'),
      proposalId: z.string().describe('A unique identifier for this proposed change'),
      description: z
        .string()
        .optional()
        .describe('Human-readable description of what the change does'),
    }),
    tags: ['workflows', 'yaml', 'edit'],
    availability: workflowEditAvailability,
    handler: async ({ yaml, proposalId, description }, context) => {
      const attachment = findWorkflowYamlAttachment(context);
      if (!attachment) return noAttachmentError();

      const diffAttachmentId = await emitDiffAndUpdateYaml(
        context,
        attachment.attachmentId,
        attachment.yaml,
        yaml,
        proposalId,
        description,
        attachment.workflowId,
        attachment.name
      );

      const validation = await runCompactValidation(yaml, api, context);

      return {
        results: [
          {
            type: 'other' as const,
            data: {
              success: true,
              proposalId,
              diffAttachmentId,
              toolId: WORKFLOW_REPLACE_YAML_TOOL_ID,
              description: description ?? 'Full YAML replacement proposed',
              ...(validation ? { validation } : {}),
            },
          },
        ],
      };
    },
  });
}
