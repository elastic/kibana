/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const WORKFLOW_START_SUCCESS_TOAST = i18n.translate(
  'workflowsUi.runWorkflowPanel.start.success.toast',
  {
    defaultMessage: 'Workflow successfully started',
  }
);

export const WORKFLOW_START_SUCCESS_BUTTON = i18n.translate(
  'workflowsUi.runWorkflowPanel.start.success.button',
  {
    defaultMessage: 'View workflow execution',
  }
);

export const WORKFLOW_START_FAILED_TOAST = i18n.translate(
  'workflowsUi.runWorkflowPanel.start.failed.toast',
  {
    defaultMessage: 'Workflow failed to start',
  }
);

export const RUN_WORKFLOW_BUTTON = i18n.translate('workflowsUi.runWorkflowPanel.run.button', {
  defaultMessage: 'Run workflow',
});

/** Returns the localised message shown at the top of the inputs modal. */
export const getProvideInputsResumeMessage = (workflowName: string) =>
  i18n.translate('workflowsUi.runWorkflowPanel.inputs.resumeMessage', {
    defaultMessage: 'Provide inputs to run {workflowName}',
    values: { workflowName },
  });
