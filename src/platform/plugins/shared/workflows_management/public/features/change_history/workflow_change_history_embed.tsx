/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  ChangeHistoryModal,
  ChangeHistoryProvider,
  ChangeHistoryTrigger,
} from '@kbn/change-history-ui';

import {
  useWorkflowChangeHistoryAdapter,
  useWorkflowChangeHistoryEnabled,
} from './use_workflow_change_history';
import { BACK_TO_WORKFLOW } from './translations';
import { renderWorkflowChangeHistoryBadge } from './workflow_change_history_badge';
import { renderWorkflowChangeHistoryPreview } from './workflow_change_history_preview';

export interface WorkflowChangeHistoryEmbedProps {
  workflowId: string;
  workflowName?: string;
}

export const WorkflowChangeHistoryEmbed = ({
  workflowId,
  workflowName,
}: WorkflowChangeHistoryEmbedProps): JSX.Element | null => {
  const isEnabled = useWorkflowChangeHistoryEnabled();
  const adapter = useWorkflowChangeHistoryAdapter();

  if (!isEnabled) {
    return null;
  }

  return (
    <ChangeHistoryProvider
      objectId={workflowId}
      adapter={adapter}
      renderPreview={renderWorkflowChangeHistoryPreview}
      renderBadge={renderWorkflowChangeHistoryBadge}
      labels={{
        previewBackLabel: BACK_TO_WORKFLOW,
        previewTitle: workflowName,
      }}
    >
      <ChangeHistoryTrigger buttonProps={{ size: 's' }} />
      <ChangeHistoryModal />
    </ChangeHistoryProvider>
  );
};
