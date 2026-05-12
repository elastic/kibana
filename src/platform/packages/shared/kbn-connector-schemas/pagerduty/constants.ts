/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';

export const CONNECTOR_ID = '.pagerduty';
export const CONNECTOR_NAME = i18n.translate('connectors.pagerduty.title', {
  defaultMessage: 'PagerDuty',
});

// uses the PagerDuty Events API v2
// https://v2.developer.pagerduty.com/docs/events-api-v2
export const PAGER_DUTY_API_URL = 'https://events.pagerduty.com/v2/enqueue';

export const EVENT_ACTION_TRIGGER = 'trigger';
export const EVENT_ACTION_RESOLVE = 'resolve';
export const EVENT_ACTION_ACKNOWLEDGE = 'acknowledge';

export const EVENT_ACTIONS_WITH_REQUIRED_DEDUPKEY = new Set([
  EVENT_ACTION_RESOLVE,
  EVENT_ACTION_ACKNOWLEDGE,
]);
