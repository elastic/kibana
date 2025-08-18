/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const MODAL_TITLE = i18n.translate('responseOpsAlertDelete.modalTitle', {
  defaultMessage: 'Clean up alerts',
});

export const MODAL_DESCRIPTION = i18n.translate('responseOpsAlertDelete.modalDescription', {
  defaultMessage: 'Remove alerts that exceed a threshold age or duration',
});

export const MODAL_DESCRIPTION_EXCEPTION = i18n.translate(
  'responseOpsAlertDelete.modalDescriptionException',
  {
    defaultMessage: 'Alerts attached to cases will not be deleted by this cleanup task',
  }
);

export const FORM_TITLE = i18n.translate('responseOpsAlertDelete.modalFormTitle', {
  defaultMessage: 'Select the type of alerts to include in this cleanup task',
});

export const ACTIVE_ALERTS = i18n.translate('responseOpsAlertDelete.activeAlerts', {
  defaultMessage: 'Active alerts',
});

export const ACTIVE_ALERTS_DESCRIPTION = i18n.translate(
  'responseOpsAlertDelete.activeAlertsDescription',
  {
    defaultMessage: 'Remove alerts that are active and older than the threshold',
  }
);

export const INACTIVE_ALERTS = i18n.translate('responseOpsAlertDelete.inactiveAlerts', {
  defaultMessage: 'Inactive alerts',
});

export const INACTIVE_ALERTS_DESCRIPTION = i18n.translate(
  'responseOpsAlertDelete.inactiveAlertsDescription',
  {
    defaultMessage:
      'Remove alerts that were recovered, closed, acknowledged, or untracked longer than the threshold',
  }
);

export const MODAL_SUBMIT = i18n.translate('responseOpsAlertDelete.modalSubmit', {
  defaultMessage: 'Run clean up task',
});

export const MODAL_CANCEL = i18n.translate('responseOpsAlertDelete.modalCancel', {
  defaultMessage: 'Cancel',
});

export const DAYS = i18n.translate('responseOpsAlertDelete.days', {
  defaultMessage: 'days',
});

export const MONTHS = i18n.translate('responseOpsAlertDelete.months', {
  defaultMessage: 'months',
});

export const YEARS = i18n.translate('responseOpsAlertDelete.years', {
  defaultMessage: 'years',
});

export const DAY = i18n.translate('responseOpsAlertDelete.day', {
  defaultMessage: 'day',
});

export const MONTH = i18n.translate('responseOpsAlertDelete.month', {
  defaultMessage: 'month',
});

export const YEAR = i18n.translate('responseOpsAlertDelete.year', {
  defaultMessage: 'year',
});

export const DELETE_PASSKEY = i18n.translate('responseOpsAlertDelete.deletePasskey', {
  defaultMessage: 'Delete',
});

export const DELETE_CONFIRMATION = i18n.translate('responseOpsAlertDelete.deleteConfirmation', {
  defaultMessage: `Type "${DELETE_PASSKEY}" to confirm clean up task`,
});

export const THRESHOLD_ERROR_MAX = i18n.translate('responseOpsAlertDelete.thresholdErrorMax', {
  defaultMessage: 'Threshold limit of 3 years',
});

export const THRESHOLD_ERROR_MIN = i18n.translate('responseOpsAlertDelete.thresholdErrorMin', {
  defaultMessage: 'Threshold must be at least 1 day',
});

export const RULE_SETTINGS_TITLE = i18n.translate('responseOpsAlertDelete.ruleSettingsTitle', {
  defaultMessage: 'Clean up alert history',
});

export const RULE_SETTINGS_DESCRIPTION = i18n.translate(
  'responseOpsAlertDelete.ruleSettingsDescription',
  {
    defaultMessage:
      'Clean up alert history by removing old active alerts and long-inactive alerts based on customizable time thresholds',
  }
);

export const RULE_SETTINGS_TECH_PREVIEW_LABEL = i18n.translate(
  'responseOpsAlertDelete.ruleSettingsTechPreviewLabel',
  {
    defaultMessage: 'Technical preview',
  }
);

export const RULE_SETTINGS_TECH_PREVIEW_DESCRIPTION = i18n.translate(
  'responseOpsAlertDelete.ruleSettingsTechPreviewDescription',
  {
    defaultMessage:
      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
  }
);

export const RUN_CLEANUP_TASK = i18n.translate('responseOpsAlertDelete.ruleSettingsCleanUp', {
  defaultMessage: 'Clean up',
});

export const ALERT_DELETE_SUCCESS = i18n.translate('responseOpsAlertDelete.alertDeleteSuccess', {
  defaultMessage: 'Clean up task started successfully',
});

export const ALERT_DELETE_FAILURE = i18n.translate('responseOpsAlertDelete.alertDeleteFailure', {
  defaultMessage: 'Failed to start clean up task',
});

export const UNKNOWN_ERROR = i18n.translate('responseOpsAlertDelete.unknownError', {
  defaultMessage: 'Unknown error',
});

export const ALERT_DELETE_LAST_RUN = (date?: string) =>
  i18n.translate('responseOpsAlertDelete.alertDeleteLastRun', {
    defaultMessage: 'Last cleanup task: {date, select, undefined {Loading...} other {{date}}}',
    values: { date },
  });
