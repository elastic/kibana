/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AttachmentFormatContext,
  AttachmentResolveContext,
} from '@kbn/agent-builder-server/attachments';
import { z } from '@kbn/zod/v4';
import type { AgentBuilderPluginSetupContract } from '../../types';
import type { WorkflowsManagementApi } from '../../workflows_management/workflows_management_api';
import { GET_CONNECTORS_TOOL_ID } from '../tools/get_connectors_tool';
import { GET_EXAMPLES_TOOL_ID } from '../tools/get_examples_tool';
import { GET_STEP_DEFINITIONS_TOOL_ID } from '../tools/get_step_definitions_tool';
import { GET_TRIGGER_DEFINITIONS_TOOL_ID } from '../tools/get_trigger_definitions_tool';
import { GET_WORKFLOW_TOOL_ID } from '../tools/get_workflow_tool';
import { LIST_WORKFLOWS_TOOL_ID } from '../tools/list_workflows_tool';
import { VALIDATE_WORKFLOW_TOOL_ID } from '../tools/validate_workflow_tool';
import {
  WORKFLOW_DELETE_STEP_TOOL_ID,
  WORKFLOW_INSERT_STEP_TOOL_ID,
  WORKFLOW_MODIFY_PROPERTY_TOOL_ID,
  WORKFLOW_MODIFY_STEP_PROPERTY_TOOL_ID,
  WORKFLOW_MODIFY_STEP_TOOL_ID,
  WORKFLOW_REPLACE_YAML_TOOL_ID,
} from '../tools/workflow_edit_tools';

export const WORKFLOW_YAML_ATTACHMENT_TYPE = 'workflow.yaml';

const clientDiagnosticSchema = z.object({
  severity: z.enum(['error', 'warning']),
  message: z.string(),
  source: z.string(),
});

const workflowYamlDataSchema = z.object({
  yaml: z.string().describe('The workflow YAML content'),
  workflowId: z.string().optional().describe('The workflow ID'),
  name: z.string().optional().describe('The workflow name'),
  clientDiagnostics: z
    .array(clientDiagnosticSchema)
    .optional()
    .describe('Client-side validation diagnostics from the editor'),
});

type WorkflowYamlData = z.infer<typeof workflowYamlDataSchema>;

const workflowYamlOriginSchema = z.object({
  workflowId: z.string().describe('The workflow ID to resolve'),
});

type WorkflowYamlOrigin = z.infer<typeof workflowYamlOriginSchema>;

const createWorkflowYamlAttachmentType = (api: WorkflowsManagementApi) => ({
  id: WORKFLOW_YAML_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input: unknown) => {
    const parseResult = workflowYamlDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true as const, data: parseResult.data };
    }
    return { valid: false as const, error: parseResult.error.message };
  },
  validateOrigin: (input: unknown) => {
    const parseResult = workflowYamlOriginSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true as const, data: parseResult.data };
    }
    return { valid: false as const, error: parseResult.error.message };
  },
  resolve: async (
    origin: WorkflowYamlOrigin,
    context: AttachmentResolveContext
  ): Promise<WorkflowYamlData | undefined> => {
    const workflow = await api.getWorkflow(origin.workflowId, context.spaceId);
    if (!workflow) return undefined;
    return { yaml: workflow.yaml, workflowId: workflow.id, name: workflow.name };
  },
  format: (attachment: { data: WorkflowYamlData }, context: AttachmentFormatContext) => {
    const { data } = attachment;
    return {
      getRepresentation: async (): Promise<{ type: 'text'; value: string }> => {
        let validationSection = '';
        try {
          const result = await api.validateWorkflow(data.yaml, context.spaceId, context.request);
          if (result.valid) {
            validationSection = '\n\nValidation: valid';
          } else {
            const errors = result.diagnostics.filter(
              (d: { severity: string }) => d.severity === 'error'
            );
            const warnings = result.diagnostics.filter(
              (d: { severity: string }) => d.severity === 'warning'
            );
            const errorLines = errors
              .map(
                (d: { source: string; message: string; path?: Array<string | number> }) =>
                  `- [${d.source}] ${d.message}${d.path ? ` (at ${d.path.join('.')})` : ''}`
              )
              .join('\n');
            validationSection = `\n\nValidation errors (${errors.length}):\n${errorLines}`;
            if (warnings.length > 0) {
              const warningLines = warnings
                .map(
                  (d: { source: string; message: string; path?: Array<string | number> }) =>
                    `- [${d.source}] ${d.message}${d.path ? ` (at ${d.path.join('.')})` : ''}`
                )
                .join('\n');
              validationSection += `\n\nValidation warnings (${warnings.length}):\n${warningLines}`;
            }
          }
        } catch {
          // Validation service unavailable; LLM can use validate_workflow tool.
        }

        if (data.clientDiagnostics && data.clientDiagnostics.length > 0) {
          const clientErrors = data.clientDiagnostics.filter((d) => d.severity === 'error');
          const clientWarnings = data.clientDiagnostics.filter((d) => d.severity === 'warning');
          if (clientErrors.length > 0) {
            const lines = clientErrors.map((d) => `- [${d.source}] ${d.message}`).join('\n');
            validationSection += `\n\nClient-side validation errors (${clientErrors.length}):\n${lines}`;
          }
          if (clientWarnings.length > 0) {
            const lines = clientWarnings.map((d) => `- [${d.source}] ${d.message}`).join('\n');
            validationSection += `\n\nClient-side validation warnings (${clientWarnings.length}):\n${lines}`;
          }
        }

        return {
          type: 'text' as const,
          value:
            `Current Workflow YAML:\n\n\`\`\`yaml\n${data.yaml}\n\`\`\`` +
            `${validationSection}\n\n` +
            `Use the workflow edit tools (workflow_insert_step, workflow_modify_step, workflow_modify_step_property, workflow_modify_property, workflow_delete_step, workflow_replace_yaml) to modify this workflow.\n` +
            `When inserting or modifying steps, provide step definitions as structured JSON objects — the tools will generate properly formatted YAML.\n` +
            `Each edit tool emits a diff attachment and updates this YAML attachment for subsequent edits.`,
        };
      },
    };
  },
  getTools: () => [
    WORKFLOW_INSERT_STEP_TOOL_ID,
    WORKFLOW_MODIFY_STEP_TOOL_ID,
    WORKFLOW_MODIFY_STEP_PROPERTY_TOOL_ID,
    WORKFLOW_MODIFY_PROPERTY_TOOL_ID,
    WORKFLOW_DELETE_STEP_TOOL_ID,
    WORKFLOW_REPLACE_YAML_TOOL_ID,
    GET_STEP_DEFINITIONS_TOOL_ID,
    GET_TRIGGER_DEFINITIONS_TOOL_ID,
    GET_EXAMPLES_TOOL_ID,
    GET_CONNECTORS_TOOL_ID,
    VALIDATE_WORKFLOW_TOOL_ID,
    LIST_WORKFLOWS_TOOL_ID,
    GET_WORKFLOW_TOOL_ID,
  ],
  getAgentDescription: () =>
    `workflow.yaml attachments represent the current state of an Elastic Workflow YAML document.\n` +
    `All workflow authoring tools are already available — do NOT load the workflow-authoring skill via filestore.read.\n` +
    `The workflow YAML and any validation errors are shown in the attachment content — do NOT call attachment_read to re-read them.\n\n` +
    `## Editing Rules\n\n` +
    `- Use edit tools to propose changes. NEVER paste full YAML into your response text.\n` +
    `- Each edit tool returns diffAttachmentId, attachmentId, and attachmentVersion\n` +
    `- Render the diff with <render_attachment id="{diffAttachmentId}"/>\n` +
    `- Render the updated workflow with <render_attachment id="{attachmentId}" version="{attachmentVersion}"/> — the version attribute is required so the UI shows the latest content\n` +
    `- Edit tools auto-validate the result and return a \`validation\` field — no need to call validate_workflow separately after edits.\n` +
    `- Prefer surgical edits (workflow_modify_step, workflow_modify_step_property) over workflow_replace_yaml\n` +
    `- Use get_step_definitions to look up step type schemas when needed\n` +
    `- Use get_examples to find working workflow patterns\n\n` +
    `## Rendering\n\n` +
    `- The workflow.yaml attachment is rendered in chat as a YAML code preview with a Save button.\n` +
    `- You can render it with <render_attachment id="{attachmentId}"/> where {attachmentId} is the workflow.yaml attachment ID.\n` +
    `- After making edits, render the updated workflow.yaml attachment with the version from the tool result: <render_attachment id="{attachmentId}" version="{attachmentVersion}"/>. The version attribute ensures the UI displays the latest content.\n\n` +
    `## Workflow YAML Structure\n\n` +
    `\`\`\`yaml\nversion: '1'\nname: Workflow Name\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n  - name: step_name\n    type: step_type\n    with:\n      param1: value1\n\`\`\`\n\n` +
    `## Common Step Properties\n\n` +
    `Every step supports these properties regardless of type:\n\n` +
    `\`\`\`yaml\n` +
    `- name: unique_step_name       # required, unique within the workflow\n` +
    `  type: step_type              # required\n` +
    `  with:                        # input parameters (specific to step type)\n` +
    `    param1: value1\n` +
    `  connector-id: my-connector   # only for connector-based steps\n` +
    `  if: "steps.prev.output.ok"   # optional, skip step when condition is falsy\n` +
    `  timeout: "30s"               # optional, step-level timeout\n` +
    `  on-failure:                  # optional, error handling\n` +
    `    retry:\n` +
    `      max-attempts: 3\n` +
    `\`\`\`\n\n` +
    `**IMPORTANT**: The step-level conditional property is \`if\`, NOT \`condition\`.\n` +
    `\`condition\` is a config param specific to the \`if\` step type (alongside \`steps\`/\`else\`).\n\n` +
    `## Common Fixes\n\n` +
    `- Liquid expressions must be quoted in YAML: \`"{{ steps.name.output.field }}"\`\n` +
    `- ES|QL params must be an array of positional values (\`?\` placeholder), not a named map\n` +
    `- All workflows need \`version: '1'\` at the root\n` +
    `- Each step needs a unique \`name\` and valid \`type\`\n` +
    `- Step input parameters go in the \`with\` block\n` +
    `- Config params are step-level fields outside \`with\` (e.g. \`condition\`/\`steps\`/\`else\` for the \`if\` step type, \`foreach\`/\`steps\` for \`foreach\`)\n` +
    `- Connector-based steps require a \`connector-id\` field`,
});

export function registerWorkflowYamlAttachment(
  agentBuilder: AgentBuilderPluginSetupContract,
  api: WorkflowsManagementApi
): void {
  agentBuilder.attachments.registerType(
    createWorkflowYamlAttachmentType(api) as Parameters<
      typeof agentBuilder.attachments.registerType
    >[0]
  );
}
