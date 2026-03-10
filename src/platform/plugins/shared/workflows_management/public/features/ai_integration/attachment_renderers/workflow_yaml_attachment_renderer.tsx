/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

interface WorkflowYamlData {
  yaml: string;
  workflowId?: string;
  name?: string;
}

interface WorkflowYamlAttachment {
  id: string;
  type: string;
  data: WorkflowYamlData;
}

const ACTION_TYPE_PRIMARY = 'primary';
const ACTION_TYPE_SECONDARY = 'secondary';

export const workflowYamlAttachmentUiDefinition = {
  getLabel: (attachment: WorkflowYamlAttachment) =>
    attachment.data.name ||
    i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.label', {
      defaultMessage: 'Workflow',
    }),
  getIcon: () => 'workflowsApp',
  getActionButtons: ({
    attachment,
    openCanvas,
  }: {
    attachment: WorkflowYamlAttachment;
    openCanvas?: () => void;
  }) => {
    const buttons: Array<{
      label: string;
      icon: string;
      type: string;
      handler: () => void;
    }> = [];

    if (openCanvas) {
      buttons.push({
        label: i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.preview', {
          defaultMessage: 'Preview',
        }),
        icon: 'eye',
        type: ACTION_TYPE_SECONDARY,
        handler: openCanvas,
      });
    }

    if (attachment.data.workflowId) {
      buttons.push({
        label: i18n.translate('workflowsManagement.attachmentRenderers.workflowYaml.openEditor', {
          defaultMessage: 'Open editor',
        }),
        icon: 'popout',
        type: ACTION_TYPE_PRIMARY,
        handler: () => {
          window.location.assign(`/app/workflows/workflow/${attachment.data.workflowId}`);
        },
      });
    }

    return buttons;
  },
};
