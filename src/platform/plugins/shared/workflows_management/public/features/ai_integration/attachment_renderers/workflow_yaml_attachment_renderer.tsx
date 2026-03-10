/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { i18n } from '@kbn/i18n';

interface WorkflowYamlData {
  yaml: string;
  workflowId?: string;
  name?: string;
}

export type WorkflowYamlAttachment = Attachment<'workflow.yaml', WorkflowYamlData>;

export const workflowYamlAttachmentUiDefinition: AttachmentUIDefinition<WorkflowYamlAttachment> = {
  getLabel: (attachment) =>
    attachment.data.name ||
    i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.label', {
      defaultMessage: 'Workflow',
    }),
  getIcon: () => 'workflowsApp',
};
