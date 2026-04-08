/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const EXECUTION_TRACKER_TITLE = i18n.translate('kbn.workflowsUi.executionTracker.title', {
  defaultMessage: 'Workflow executions',
});

export const BADGE_RUNNING_LABEL = (count: number) =>
  i18n.translate('kbn.workflowsUi.executionTracker.badgeRunning', {
    defaultMessage: '{count} running',
    values: { count },
  });

export const BADGE_COMPLETED_LABEL = (count: number) =>
  i18n.translate('kbn.workflowsUi.executionTracker.badgeCompleted', {
    defaultMessage: '{count} completed',
    values: { count },
  });

export const BADGE_FAILED_LABEL = (count: number) =>
  i18n.translate('kbn.workflowsUi.executionTracker.badgeFailed', {
    defaultMessage: '{count} failed',
    values: { count },
  });

export const DISMISS_ALL_COMPLETED_LABEL = i18n.translate(
  'kbn.workflowsUi.executionTracker.dismissAllCompleted',
  { defaultMessage: 'Dismiss all completed' }
);

export const CLOSE_LABEL = i18n.translate('kbn.workflowsUi.executionTracker.close', {
  defaultMessage: 'Close',
});

export const DISMISS_LABEL = i18n.translate('kbn.workflowsUi.executionTracker.dismiss', {
  defaultMessage: 'Dismiss',
});

export const UNKNOWN_WORKFLOW_LABEL = i18n.translate(
  'kbn.workflowsUi.executionTracker.unknownWorkflow',
  { defaultMessage: 'Unknown workflow' }
);

export const NO_ACTIVE_EXECUTIONS_LABEL = i18n.translate(
  'kbn.workflowsUi.executionTracker.noActiveExecutions',
  { defaultMessage: 'No active executions' }
);

export const INPUT_LABEL = i18n.translate('kbn.workflowsUi.executionTracker.input', {
  defaultMessage: 'Input',
});

export const OUTPUT_LABEL = i18n.translate('kbn.workflowsUi.executionTracker.output', {
  defaultMessage: 'Output',
});

export const VIEW_EXECUTION_LABEL = i18n.translate(
  'kbn.workflowsUi.executionTracker.viewExecution',
  { defaultMessage: 'View execution' }
);
