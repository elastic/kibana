/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

const PREFIX = 'alertsUIShared.rulesSettings.alertDeletion';

export const DAYS_LABEL = i18n.translate(`${PREFIX}.thresholdUnitLabel`, {
  defaultMessage: 'Days',
});

export const THRESHOLD_LABEL = i18n.translate(`${PREFIX}.thresholdFieldLabel`, {
  defaultMessage: 'Threshold',
});

export const ACTIVE_ALERT_DELETION_LABEL = i18n.translate(`${PREFIX}.activeAlertsLabel`, {
  defaultMessage: 'Active alert deletion',
});

export const INACTIVE_ALERT_DELETION_LABEL = i18n.translate(`${PREFIX}.inactiveAlertsLabel`, {
  defaultMessage: 'Inactive alert deletion',
});

export const ALERT_DELETION_ERROR_PROMPT_TITLE = i18n.translate(`${PREFIX}.errorPromptTitle`, {
  defaultMessage: 'Unable to load your query delay settings',
});

export const ALERT_DELETION_ERROR_PROMPT_BODY = i18n.translate(`${PREFIX}.errorPromptBody`, {
  defaultMessage:
    'There was an error loading your alert deletion settings. Contact your administrator for help',
});

export const ALERT_DELETION_TITLE = i18n.translate(`${PREFIX}.title`, {
  defaultMessage: 'Alert deletion',
});

export const ALERT_DELETION_DESCRIPTION = i18n.translate(`${PREFIX}.description`, {
  defaultMessage:
    'Clean up alert history by removing old active alerts and long-inactive alerts based on customizable time thresholds.',
});

export const ALERT_DELETION_LAST_RUN = i18n.translate(`${PREFIX}.lastRun`, {
  defaultMessage: `Current settings would delete N alerts in total.`,
});

export const ALERT_DELETION_AFFECTED_ALERTS = (affectedAlerts: number) =>
  i18n.translate(`${PREFIX}.affectedAlerts`, {
    defaultMessage: `{affectedAlerts} alerts would be deleted with the current settings.`,
    values: { affectedAlerts },
  });
