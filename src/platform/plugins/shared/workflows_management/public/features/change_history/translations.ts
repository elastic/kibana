/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import { WorkflowChangeHistoryAction } from '../../../common/lib/workflow_change_history/constants';

export const SYSTEM_ACTOR_NAME = i18n.translate(
  'xpack.workflowsManagement.changeHistory.systemActorName',
  {
    defaultMessage: 'System',
  }
);

const ACTION_LABELS: Record<string, string> = {
  [WorkflowChangeHistoryAction.workflowCreate]: i18n.translate(
    'xpack.workflowsManagement.changeHistory.action.create',
    {
      defaultMessage: 'Created',
    }
  ),
  [WorkflowChangeHistoryAction.workflowUpdate]: i18n.translate(
    'xpack.workflowsManagement.changeHistory.action.update',
    {
      defaultMessage: 'Updated',
    }
  ),
  [WorkflowChangeHistoryAction.workflowInstall]: i18n.translate(
    'xpack.workflowsManagement.changeHistory.action.install',
    {
      defaultMessage: 'Installed',
    }
  ),
};

export const formatWorkflowChangeAction = (action: string): string =>
  ACTION_LABELS[action] ?? action;
