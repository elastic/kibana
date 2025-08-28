/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const SEARCH_WORKFLOWS = i18n.translate(
  'xpack.workflowsManagement.workflowsList.searchAriaLabel',
  {
    defaultMessage: 'Search workflows',
  }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'plugins.workflowsManagement.workflowsList.searchPlaceholder',
  {
    defaultMessage: 'Workflow name/description',
  }
);

export const MANUAL_TRIGGERS_DESCRIPTIONS: Record<string, string> = {
  manual: i18n.translate(
    'plugins.workflowsManagement.workflowsExecution.manualTriggerDescription',
    {
      defaultMessage: 'Provide values based on workflow definition.',
    }
  ),
  alert: i18n.translate('plugins.workflowsManagement.workflowsExecution.alertTriggerDescription', {
    defaultMessage: 'Select an alert to trigger workflow',
  }),
  scheduled: i18n.translate(
    'plugins.workflowsManagement.workflowsExecution.scheduledTriggerDescription',
    {
      defaultMessage: 'Select a schedule to trigger workflow',
    }
  ),
};
