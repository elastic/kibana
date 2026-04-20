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
import {
  WORKFLOW_YAML_ATTACHMENT_TYPE,
  workflowTools,
} from '../../../common/agent_builder/constants';
import type { WorkflowsManagementApi } from '../../api/workflows_management_api';
import type { AgentBuilderPluginSetupContract } from '../../types';

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

const workflowYamlOriginSchema = z.string().describe('The workflow ID to resolve');

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
    origin: string,
    context: AttachmentResolveContext
  ): Promise<WorkflowYamlData | undefined> => {
    const workflow = await api.getWorkflow(origin, context.spaceId);
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
            `Use the workflow edit tools (${workflowTools.insertStep}, ${workflowTools.modifyStep}, ${workflowTools.modifyStepProperty}, ${workflowTools.modifyProperty}, ${workflowTools.deleteStep}, ${workflowTools.setYaml}) to modify this workflow.\n` +
            `When inserting or modifying steps, provide step definitions as structured JSON objects — the tools will generate properly formatted YAML.\n` +
            `Each edit tool emits a diff attachment and updates this YAML attachment for subsequent edits.`,
        };
      },
    };
  },
  getTools: () => Object.values(workflowTools),
  getAgentDescription: () =>
    `${WORKFLOW_YAML_ATTACHMENT_TYPE} attachments represent the current state of an Elastic Workflow YAML document.\n` +
    `To create a new workflow from scratch (when no ${WORKFLOW_YAML_ATTACHMENT_TYPE} attachment exists), call ${workflowTools.setYaml} with the full YAML — it will create the attachment automatically. Do NOT use attachments.add or attachment_add to create workflow attachments manually.\n` +
    `All workflow authoring tools are already available — do NOT load the workflow-authoring skill via filestore.read.\n` +
    `The workflow YAML and any validation errors are shown in the attachment content — do NOT call attachment_read to re-read them.\n\n` +
    `## Editing Rules\n\n` +
    `- To create a new workflow, use ${workflowTools.setYaml} with the complete YAML. It creates the attachment automatically — do NOT call attachments.add or attachment_add.\n` +
    `- Use edit tools to propose changes. NEVER paste full YAML into your response text.\n` +
    `- Each edit tool returns diffAttachmentId, attachmentId, and attachmentVersion\n` +
    `- Render the diff with <render_attachment id="{diffAttachmentId}"/>\n` +
    `- Render the updated workflow with <render_attachment id="{attachmentId}" version="{attachmentVersion}"/> — the version attribute is required so the UI shows the latest content\n` +
    `- Edit tools auto-validate the result and return a \`validation\` field — no need to call ${workflowTools.validateWorkflow} separately after edits.\n` +
    `- Prefer surgical edits (${workflowTools.modifyStep}, ${workflowTools.modifyStepProperty}) over ${workflowTools.setYaml}\n` +
    `- **ALWAYS call ${workflowTools.getStepDefinitions} to verify the exact step type ID before changing a step's type or inserting a new step.** Step types have specific IDs (e.g. \`kibana.createCase\`, not \`kibana\`).\n` +
    `- Use ${workflowTools.getExamples} to find working workflow patterns\n\n` +
    `## Rendering\n\n` +
    `- The ${WORKFLOW_YAML_ATTACHMENT_TYPE} attachment is rendered in chat as a YAML code preview with a Save button.\n` +
    `- You can render it with <render_attachment id="{attachmentId}"/> where {attachmentId} is the ${WORKFLOW_YAML_ATTACHMENT_TYPE} attachment ID.\n` +
    `- After making edits, render the updated ${WORKFLOW_YAML_ATTACHMENT_TYPE} attachment with the version from the tool result: <render_attachment id="{attachmentId}" version="{attachmentVersion}"/>. The version attribute ensures the UI displays the latest content.\n\n` +
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
    `- Step outputs are accessed via \`steps.<name>.output\` — NEVER \`steps.<name>.with.*\` or \`steps.<name>.<input_param>\`. A step's input parameters (\`with\` block) are NOT accessible as variables; only \`output\` is. Use \`${workflowTools.getStepDefinitions}\` with \`includeOutputSummary\` to learn what a step's output contains.\n` +
    `- NEVER reference \`triggers.event\`, \`trigger.event\`, or \`triggers.event.*\` — use \`event\` directly (e.g. \`{{ event.alerts }}\`, \`{{ event.rule.name }}\`). The \`triggers\` block configures trigger types, not runtime data.\n` +
    `- For alert triggers: \`event.alerts\` is an array, \`event.rule\` has \`id\`/\`name\`/\`tags\`, \`event.spaceId\` is the space\n` +
    `- ES|QL params must be an array of positional values (\`?\` placeholder), not a named map\n` +
    `- All workflows need \`version: '1'\` at the root\n` +
    `- Each step needs a unique \`name\` and valid \`type\`\n` +
    `- Step input parameters go in the \`with\` block\n` +
    `- Config params are step-level fields outside \`with\` (e.g. \`condition\`/\`steps\`/\`else\` for the \`if\` step type, \`foreach\`/\`steps\` for \`foreach\`)\n` +
    `- Connector-based steps require a \`connector-id\` field\n` +
    `- When fixing an error, scan the entire YAML for other occurrences of the same mistake and fix them all`,
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
