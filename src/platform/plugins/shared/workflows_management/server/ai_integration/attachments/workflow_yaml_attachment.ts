/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { AgentBuilderPluginSetupContract } from '../../types';

export const WORKFLOW_YAML_ATTACHMENT_TYPE = 'workflow.yaml';

const workflowYamlDataSchema = z.object({
  yaml: z.string().describe('The workflow YAML content'),
});

type WorkflowYamlData = z.infer<typeof workflowYamlDataSchema>;

const workflowYamlAttachmentType = {
  id: WORKFLOW_YAML_ATTACHMENT_TYPE,
  type: 'inline',
  validate: (input) => {
    const parseResult = workflowYamlDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    } else {
      return { valid: false, error: parseResult.error.message };
    }
  },
  format: (data) => {
    return {
      type: 'text',
      value: `Current Workflow YAML:

\`\`\`yaml
${data.yaml}
\`\`\`

Use the browser API tools (workflow_insert_step, workflow_modify_step, workflow_delete_step, workflow_replace_yaml) to modify this workflow.
When inserting or modifying steps, ensure the YAML is properly formatted with correct indentation (2 spaces per level).`,
    };
  },
};

/**
 * Registers the workflow.yaml attachment type with the Agent Builder.
 * This attachment type is used to provide the current workflow YAML as context
 * when conversing with the workflow editor agent.
 */
export function registerWorkflowYamlAttachment(
  agentBuilder: AgentBuilderPluginSetupContract
): void {
  agentBuilder.attachments.registerType(workflowYamlAttachmentType);
}
