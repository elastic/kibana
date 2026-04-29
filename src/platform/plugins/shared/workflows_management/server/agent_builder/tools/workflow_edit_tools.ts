/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 } from 'uuid';
import { ToolType } from '@kbn/agent-builder-common';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { parseYamlToJSONWithoutValidation } from '@kbn/workflows-yaml';
import { z } from '@kbn/zod/v4';
import type { EditResult, StepDefinition } from './yaml_edit_utils';
import {
  deleteStep,
  insertStep,
  modifyStep,
  modifyStepProperty,
  modifyWorkflowProperty,
} from './yaml_edit_utils';
import {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  WORKFLOW_YAML_CHANGED_EVENT,
  WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
  workflowTools,
} from '../../../common/agent_builder/constants';
import type { WorkflowsManagementApi } from '../../api/workflows_management_api';
import type { WorkflowsAiTelemetryClient } from '../../telemetry/workflows_ai_telemetry_client';
import type { AgentBuilderPluginSetupContract } from '../../types';

const workflowEditAvailability = {
  handler: async ({ uiSettings }: { uiSettings: { get: <T>(id: string) => Promise<T> } }) => {
    const isEnabled = await uiSettings.get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
    return isEnabled
      ? ({ status: 'available' } as const)
      : ({ status: 'unavailable', reason: 'AI workflow authoring is disabled' } as const);
  },
  cacheMode: 'space' as const,
};

const baseWorkflowEditSchema = z.object({
  attachmentId: z
    .string()
    .optional()
    .describe(
      'The workflow.yaml attachment ID to modify. IMPORTANT: always use the most recent workflow.yaml attachment from the conversation — the user may have navigated to a different workflow since the last edit.'
    ),
  description: z.string().optional().describe('Human-readable description of what the change does'),
});

const ENABLE_EXTENDED_STEP_PROPERTIES = true;

export const stepDefinitionSchema = z.object({
  name: z.string(),
  type: z.string(),
  'connector-id': z.string().optional(),
  if: z.string().optional(),
  foreach: z.string().optional(),
  with: z.record(z.string(), z.unknown()).optional(),
  output: z.record(z.string(), z.unknown()).optional(),
  steps: z.array(z.record(z.string(), z.unknown())).optional(),
  ...(ENABLE_EXTENDED_STEP_PROPERTIES
    ? {
        'on-failure': z.unknown().optional(),
        timeout: z.string().optional(),
        description: z.string().optional(),
        do: z.array(z.record(z.string(), z.unknown())).optional(),
        then: z.array(z.record(z.string(), z.unknown())).optional(),
        else: z.array(z.record(z.string(), z.unknown())).optional(),
        condition: z.string().optional(),
      }
    : {}),
});

const findWorkflowYamlAttachment = (
  context: ToolHandlerContext,
  targetAttachmentId?: string
): { yaml: string; attachmentId: string; workflowId?: string; name?: string } | null => {
  const activeAttachments = context.attachments.getActive();
  const yamlAttachment = targetAttachmentId
    ? activeAttachments.find(
        (a) => a.id === targetAttachmentId && a.type === WORKFLOW_YAML_ATTACHMENT_TYPE
      )
    : activeAttachments.findLast((a) => a.type === WORKFLOW_YAML_ATTACHMENT_TYPE);

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
  workflowName: string | undefined,
  toolId: string
): Promise<{ diffAttachmentId: string; attachmentVersion: number | undefined }> => {
  const diffAttachment = await context.attachments.add({
    type: WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
    data: {
      beforeYaml,
      afterYaml,
      proposalId,
      workflowId,
      name: workflowName,
    },
    description: description ?? 'Proposed workflow change',
  });

  const updatedAttachment = await context.attachments.update(attachmentId, {
    data: { yaml: afterYaml, workflowId, name: workflowName },
  });

  const attachmentVersion = updatedAttachment?.current_version;

  context.events.sendUiEvent(WORKFLOW_YAML_CHANGED_EVENT, {
    proposalId,
    beforeYaml,
    afterYaml,
    workflowId,
    name: workflowName,
    attachmentVersion,
    toolId,
  });

  return { diffAttachmentId: diffAttachment.id, attachmentVersion };
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

const extractConversationId = (context: ToolHandlerContext): string | undefined => {
  const agentEntry = context.runContext.stack.findLast((entry) => entry.type === 'agent');
  return agentEntry && 'conversationId' in agentEntry ? agentEntry.conversationId : undefined;
};

const handleEditResult = async (
  result: EditResult,
  context: ToolHandlerContext,
  attachmentId: string,
  beforeYaml: string,
  description: string | undefined,
  workflowId: string | undefined,
  workflowName: string | undefined,
  toolId: string,
  api: WorkflowsManagementApi,
  telemetryClient: WorkflowsAiTelemetryClient
) => {
  if (!result.success) {
    telemetryClient.reportEditResult({
      toolId,
      conversationId: extractConversationId(context),
      editSuccess: false,
      isCreation: false,
    });
    return {
      results: [
        {
          type: 'other' as const,
          data: { success: false, error: result.error, toolId },
        },
      ],
    };
  }

  const proposalId = v4();

  const { diffAttachmentId, attachmentVersion } = await emitDiffAndUpdateYaml(
    context,
    attachmentId,
    beforeYaml,
    result.yaml,
    proposalId,
    description,
    workflowId,
    workflowName,
    toolId
  );

  const validation = await runCompactValidation(result.yaml, api, context);

  telemetryClient.reportEditResult({
    toolId,
    conversationId: extractConversationId(context),
    editSuccess: true,
    isCreation: false,
    validation: validation ?? undefined,
  });

  return {
    results: [
      {
        type: 'other' as const,
        data: {
          success: true,
          proposalId,
          diffAttachmentId,
          attachmentId,
          attachmentVersion,
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
  api: WorkflowsManagementApi,
  aiTelemetryClient: WorkflowsAiTelemetryClient
): void {
  agentBuilder.tools.register({
    id: workflowTools.insertStep,
    type: ToolType.builtin,
    description:
      'Insert a new step into the workflow. By default appends to the end of the root steps list. Use insertAfterStep to place the new step immediately after a named step at any nesting depth. Returns diffAttachmentId, attachmentId, and attachmentVersion. Render the diff with <render_attachment id="{diffAttachmentId}"/> and the updated workflow with <render_attachment id="{attachmentId}" version="{attachmentVersion}"/>.',
    schema: z.object({
      ...baseWorkflowEditSchema.shape,
      step: stepDefinitionSchema as z.ZodType<StepDefinition>,
      insertAfterStep: z
        .string()
        .optional()
        .describe(
          'Name of an existing step to insert after. The new step is placed immediately after it in the same parent sequence. If omitted, appends to the end of the root steps list.'
        ),
    }),
    tags: ['workflows', 'yaml', 'edit'],
    availability: workflowEditAvailability,
    handler: async (
      { attachmentId: targetAttachmentId, step, insertAfterStep: afterStep, description },
      context
    ) => {
      const attachment = findWorkflowYamlAttachment(context, targetAttachmentId);
      if (!attachment) return noAttachmentError();

      const result = insertStep(attachment.yaml, step, afterStep);
      return handleEditResult(
        result,
        context,
        attachment.attachmentId,
        attachment.yaml,
        description,
        attachment.workflowId,
        attachment.name,
        workflowTools.insertStep,
        api,
        aiTelemetryClient
      );
    },
  });

  agentBuilder.tools.register({
    id: workflowTools.modifyStep,
    type: ToolType.builtin,
    description:
      'Replace an entire step by name with a new step definition. The step is identified by its name. Returns diffAttachmentId, attachmentId, and attachmentVersion. Render the diff with <render_attachment id="{diffAttachmentId}"/> and the updated workflow with <render_attachment id="{attachmentId}" version="{attachmentVersion}"/>.',
    schema: z.object({
      ...baseWorkflowEditSchema.shape,
      stepName: z.string().describe('The name of the step to replace'),
      updatedStep: stepDefinitionSchema as z.ZodType<StepDefinition>,
    }),
    tags: ['workflows', 'yaml', 'edit'],
    availability: workflowEditAvailability,
    handler: async (
      { attachmentId: targetAttachmentId, stepName, updatedStep, description },
      context
    ) => {
      const attachment = findWorkflowYamlAttachment(context, targetAttachmentId);
      if (!attachment) return noAttachmentError();

      const result = modifyStep(attachment.yaml, stepName, updatedStep);
      return handleEditResult(
        result,
        context,
        attachment.attachmentId,
        attachment.yaml,
        description,
        attachment.workflowId,
        attachment.name,
        workflowTools.modifyStep,
        api,
        aiTelemetryClient
      );
    },
  });

  agentBuilder.tools.register({
    id: workflowTools.modifyStepProperty,
    type: ToolType.builtin,
    description:
      'Modify a single property of a step identified by name. Provide the property key and new value. Returns diffAttachmentId, attachmentId, and attachmentVersion. Render the diff with <render_attachment id="{diffAttachmentId}"/> and the updated workflow with <render_attachment id="{attachmentId}" version="{attachmentVersion}"/>.',
    schema: z.object({
      ...baseWorkflowEditSchema.shape,
      stepName: z.string().describe('The name of the step to modify'),
      property: z.string().describe('The property key to modify (e.g., "with", "type")'),
      value: z.unknown().describe('The new value for the property'),
    }),
    tags: ['workflows', 'yaml', 'edit'],
    availability: workflowEditAvailability,
    handler: async (
      { attachmentId: targetAttachmentId, stepName, property, value, description },
      context
    ) => {
      const attachment = findWorkflowYamlAttachment(context, targetAttachmentId);
      if (!attachment) return noAttachmentError();

      const result = modifyStepProperty(attachment.yaml, stepName, property, value);
      return handleEditResult(
        result,
        context,
        attachment.attachmentId,
        attachment.yaml,
        description,
        attachment.workflowId,
        attachment.name,
        workflowTools.modifyStepProperty,
        api,
        aiTelemetryClient
      );
    },
  });

  agentBuilder.tools.register({
    id: workflowTools.modifyProperty,
    type: ToolType.builtin,
    description:
      'Modify a top-level workflow property (e.g. name, description, trigger). Provide the property key and new value. Returns diffAttachmentId, attachmentId, and attachmentVersion. Render the diff with <render_attachment id="{diffAttachmentId}"/> and the updated workflow with <render_attachment id="{attachmentId}" version="{attachmentVersion}"/>.',
    schema: z.object({
      ...baseWorkflowEditSchema.shape,
      property: z
        .string()
        .describe('The top-level property key to modify (e.g., "name", "description", "trigger")'),
      value: z.unknown().describe('The new value for the property'),
    }),
    tags: ['workflows', 'yaml', 'edit'],
    availability: workflowEditAvailability,
    handler: async (
      { attachmentId: targetAttachmentId, property, value, description },
      context
    ) => {
      const attachment = findWorkflowYamlAttachment(context, targetAttachmentId);
      if (!attachment) return noAttachmentError();

      const result = modifyWorkflowProperty(attachment.yaml, property, value);
      return handleEditResult(
        result,
        context,
        attachment.attachmentId,
        attachment.yaml,
        description,
        attachment.workflowId,
        attachment.name,
        workflowTools.modifyProperty,
        api,
        aiTelemetryClient
      );
    },
  });

  agentBuilder.tools.register({
    id: workflowTools.deleteStep,
    type: ToolType.builtin,
    description:
      'Delete a step from the workflow by its name. Returns diffAttachmentId, attachmentId, and attachmentVersion. Render the diff with <render_attachment id="{diffAttachmentId}"/> and the updated workflow with <render_attachment id="{attachmentId}" version="{attachmentVersion}"/>.',
    schema: z.object({
      ...baseWorkflowEditSchema.shape,
      stepName: z.string().describe('The name of the step to delete'),
    }),
    tags: ['workflows', 'yaml', 'edit'],
    availability: workflowEditAvailability,
    handler: async ({ attachmentId: targetAttachmentId, stepName, description }, context) => {
      const attachment = findWorkflowYamlAttachment(context, targetAttachmentId);
      if (!attachment) return noAttachmentError();

      const result = deleteStep(attachment.yaml, stepName);
      return handleEditResult(
        result,
        context,
        attachment.attachmentId,
        attachment.yaml,
        description,
        attachment.workflowId,
        attachment.name,
        workflowTools.deleteStep,
        api,
        aiTelemetryClient
      );
    },
  });

  agentBuilder.tools.register({
    id: workflowTools.setYaml,
    type: ToolType.builtin,
    description: `Set the complete workflow YAML content. Creates a new workflow when no ${WORKFLOW_YAML_ATTACHMENT_TYPE} attachment exists, or replaces the entire YAML of an existing workflow. Use this for both creation and large-scale edits. Do NOT use attachments.add to create workflow attachments — this tool handles creation automatically. When an attachment exists, returns diffAttachmentId, attachmentId, and attachmentVersion — render the diff with <render_attachment id="{diffAttachmentId}"/> and the updated workflow with <render_attachment id="{attachmentId}" version="{attachmentVersion}"/>. When creating new, returns an attachmentId — render it with <render_attachment id="{attachmentId}"/>.`,
    schema: z.object({
      ...baseWorkflowEditSchema.shape,
      yaml: z.string().describe('The complete new workflow YAML content'),
    }),
    tags: ['workflows', 'yaml', 'edit'],
    availability: workflowEditAvailability,
    handler: async ({ attachmentId: targetAttachmentId, yaml, description }, context) => {
      const attachment = findWorkflowYamlAttachment(context, targetAttachmentId);
      const proposalId = v4();

      // When no workflow.yaml attachment exists (e.g. full-screen chat, creating
      // from scratch), create the attachment and return it directly — no diff
      // needed since there is no "before" state.
      if (!attachment) {
        const parsed = parseYamlToJSONWithoutValidation(yaml);
        const workflowName = parsed.success ? (parsed.json.name as string | undefined) : undefined;

        const newAttachment = await context.attachments.add({
          type: WORKFLOW_YAML_ATTACHMENT_TYPE,
          data: { yaml, name: workflowName },
          description: description ?? 'New workflow',
        });

        const validation = await runCompactValidation(yaml, api, context);

        aiTelemetryClient.reportEditResult({
          toolId: workflowTools.setYaml,
          conversationId: extractConversationId(context),
          editSuccess: true,
          isCreation: true,
          validation: validation ?? undefined,
        });

        return {
          results: [
            {
              type: 'other' as const,
              data: {
                success: true,
                created: true,
                proposalId,
                attachmentId: newAttachment.id,
                toolId: workflowTools.setYaml,
                description: description ?? 'New workflow created',
                ...(validation ? { validation } : {}),
              },
            },
          ],
        };
      }

      const { diffAttachmentId, attachmentVersion } = await emitDiffAndUpdateYaml(
        context,
        attachment.attachmentId,
        attachment.yaml,
        yaml,
        proposalId,
        description,
        attachment.workflowId,
        attachment.name,
        workflowTools.setYaml
      );

      const validation = await runCompactValidation(yaml, api, context);

      aiTelemetryClient.reportEditResult({
        toolId: workflowTools.setYaml,
        conversationId: extractConversationId(context),
        editSuccess: true,
        isCreation: false,
        validation: validation ?? undefined,
      });

      return {
        results: [
          {
            type: 'other' as const,
            data: {
              success: true,
              proposalId,
              diffAttachmentId,
              attachmentId: attachment.attachmentId,
              attachmentVersion,
              toolId: workflowTools.setYaml,
              description: description ?? 'Full YAML replacement proposed',
              ...(validation ? { validation } : {}),
            },
          },
        ],
      };
    },
  });
}
