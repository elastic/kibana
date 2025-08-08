/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { Trigger } from '.';

export const ALERT_RULE_TRIGGER = 'alertRule';

export const alertRuleTrigger: Trigger = {
  id: ALERT_RULE_TRIGGER,
  title: i18n.translate('uiActions.triggers.dashboard.alertRule.title', {
    defaultMessage: 'Create alert rule',
  }),
  description: i18n.translate('uiActions.triggers.dashboard.alertRule.description', {
    defaultMessage: 'Create an alert rule from this dashboard panel',
  }),
};
