/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { WorkflowTriggerTab } from './types';

export const TRIGGER_TABS_LABELS: Record<WorkflowTriggerTab, string> = {
  alert: i18n.translate('plugins.workflowsManagement.workflowsExecution.alertTriggerLabel', {
    defaultMessage: 'Alert',
  }),
  index: i18n.translate('plugins.workflowsManagement.workflowsExecution.indexTriggerLabel', {
    defaultMessage: 'Document',
  }),
  manual: i18n.translate('plugins.workflowsManagement.workflowsExecution.manualTriggerLabel', {
    defaultMessage: 'Manual',
  }),
  historical: i18n.translate(
    'plugins.workflowsManagement.workflowsExecution.historicalTriggerLabel',
    { defaultMessage: 'Historical' }
  ),
};

export const TRIGGER_TABS_DESCRIPTIONS: Record<WorkflowTriggerTab, string> = {
  manual: i18n.translate(
    'plugins.workflowsManagement.workflowsExecution.manualTriggerDescription',
    {
      defaultMessage: 'Provide custom JSON data manually.',
    }
  ),
  index: i18n.translate('plugins.workflowsManagement.workflowsExecution.indexTriggerDescription', {
    defaultMessage: 'Choose a document from Elasticsearch.',
  }),
  alert: i18n.translate('plugins.workflowsManagement.workflowsExecution.alertTriggerDescription', {
    defaultMessage: 'Choose an existing alert directly.',
  }),
  historical: i18n.translate(
    'plugins.workflowsManagement.workflowsExecution.historicalTriggerDescription',
    { defaultMessage: 'Reuse input data from previous executions.' }
  ),
};
