/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { workflowYamlAttachmentUiDefinition } from './workflow_yaml_attachment_renderer';
import { workflowYamlDiffAttachmentUiDefinition } from './workflow_yaml_diff_attachment_renderer';

const WORKFLOW_YAML_ATTACHMENT_TYPE = 'workflow.yaml';
const WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE = 'workflow.yaml.diff';

export const registerWorkflowAttachmentRenderers = (attachments: {
  addAttachmentType: (type: string, definition: unknown) => void;
}): void => {
  attachments.addAttachmentType(WORKFLOW_YAML_ATTACHMENT_TYPE, workflowYamlAttachmentUiDefinition);
  attachments.addAttachmentType(
    WORKFLOW_YAML_DIFF_ATTACHMENT_TYPE,
    workflowYamlDiffAttachmentUiDefinition
  );
};
