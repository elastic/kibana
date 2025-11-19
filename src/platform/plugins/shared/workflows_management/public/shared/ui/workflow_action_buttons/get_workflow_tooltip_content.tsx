/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

interface GetRunTooltipContentProps {
  isValid: boolean;
  canRunWorkflow: boolean;
  isEnabled: boolean;
}
export function getRunTooltipContent({
  isValid,
  canRunWorkflow,
  isEnabled,
}: GetRunTooltipContentProps) {
  if (!isValid) {
    return i18n.translate('workflows.actionButtons.runWorkflow.invalid', {
      defaultMessage: 'Fix errors to run workflow',
    });
  }
  if (!canRunWorkflow) {
    return i18n.translate('workflows.actionButtons.runWorkflow.notAllowed', {
      defaultMessage: 'You are not allowed to run workflows',
    });
  }
  if (!isEnabled) {
    return i18n.translate('workflows.actionButtons.runWorkflow.disabled', {
      defaultMessage: 'Enable the workflow to run it',
    });
  }
  return null;
}

interface GetTestRunTooltipContentProps {
  isValid: boolean;
  canRunWorkflow: boolean;
  isExecutionsTab: boolean;
}
export function getTestRunTooltipContent({
  isValid,
  canRunWorkflow,
  isExecutionsTab,
}: GetTestRunTooltipContentProps) {
  if (isExecutionsTab) {
    return i18n.translate('workflows.actionButtons.runWorkflow.executionsTab', {
      defaultMessage: 'Can not run workflow from executions tab',
    });
  }
  if (!isValid) {
    return i18n.translate('workflows.actionButtons.runWorkflow.invalid', {
      defaultMessage: 'Fix errors to run workflow',
    });
  }
  if (!canRunWorkflow) {
    return i18n.translate('workflows.actionButtons.runWorkflow.notAllowed', {
      defaultMessage: 'You are not allowed to run workflows',
    });
  }
  return null;
}

interface GetSaveWorkflowTooltipContentProps {
  isExecutionsTab: boolean;
  canSaveWorkflow: boolean;
  isCreate: boolean;
}
export function getSaveWorkflowTooltipContent({
  isExecutionsTab,
  canSaveWorkflow,
  isCreate,
}: GetSaveWorkflowTooltipContentProps) {
  if (isExecutionsTab) {
    return i18n.translate('workflows.actionButtons.saveWorkflow.executionsTab', {
      defaultMessage: 'Can not save workflow from executions tab',
    });
  }
  if (!canSaveWorkflow) {
    if (isCreate) {
      return i18n.translate('workflows.actionButtons.saveWorkflow.notAllowedCreate', {
        defaultMessage: 'You are not allowed to create workflows',
      });
    } else {
      return i18n.translate('workflows.actionButtons.saveWorkflow.notAllowed', {
        defaultMessage: 'You are not allowed to update workflows',
      });
    }
  }
  return null;
}
