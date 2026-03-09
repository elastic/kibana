/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { AgentBuilderPluginSetupContract } from '../../types';

export const WORKFLOW_YAML_ATTACHMENT_TYPE = 'workflow.yaml';

const workflowYamlDataSchema = z.object({
  yaml: z.string().describe('The workflow YAML content'),
  workflowId: z.string().optional().describe('The workflow ID'),
  name: z.string().optional().describe('The workflow name'),
});

type WorkflowYamlData = z.infer<typeof workflowYamlDataSchema>;

const workflowYamlAttachmentType = {
  id: WORKFLOW_YAML_ATTACHMENT_TYPE,
  type: 'inline' as const,
  validate: (input: unknown) => {
    const parseResult = workflowYamlDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true as const, data: parseResult.data };
    }
    return { valid: false as const, error: parseResult.error.message };
  },
  format: (attachment: { data: WorkflowYamlData }) => {
    const { data } = attachment;
    return {
      getRepresentation: () => ({
        type: 'text' as const,
        value: `Current Workflow YAML:\n\n\`\`\`yaml\n${data.yaml}\n\`\`\`\n\nUse the browser API tools (workflow_insert_step, workflow_modify_step, workflow_modify_step_property, workflow_modify_property, workflow_delete_step, workflow_replace_yaml) to modify this workflow.\nWhen inserting or modifying steps, provide step definitions as structured JSON objects — the tools will generate properly formatted YAML.`,
      }),
    };
  },
};

export function registerWorkflowYamlAttachment(
  agentBuilder: AgentBuilderPluginSetupContract
): void {
  agentBuilder.attachments.registerType(workflowYamlAttachmentType);
}
