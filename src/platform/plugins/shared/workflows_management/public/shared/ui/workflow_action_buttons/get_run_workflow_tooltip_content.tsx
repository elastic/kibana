/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export function getRunWorkflowTooltipContent(
  isValid: boolean,
  canRunWorkflow: boolean,
  isEnabled: boolean,
  isTest: boolean
) {
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
  if (!isEnabled && !isTest) {
    return i18n.translate('workflows.actionButtons.runWorkflow.disabled', {
      defaultMessage: 'Enable the workflow to run it',
    });
  }
  return null;
}
