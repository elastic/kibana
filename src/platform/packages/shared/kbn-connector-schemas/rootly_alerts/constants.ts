/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const CONNECTOR_ID = '.rootly_alerts';
export const CONNECTOR_NAME = i18n.translate('connectors.rootlyAlerts.title', {
  defaultMessage: 'Rootly Alerts',
});

export const EVENT_TRIGGER = 'trigger';
export const EVENT_RESOLVE = 'resolve';

export const MATCH_ON_SERVICE = 'service';
export const MATCH_ON_TEAM = 'team';
export const MATCH_ON_FUNCTIONALITY = 'functionality';
export const MATCH_ON_CATALOG = 'catalog';
export const MATCH_ON_CUSTOM = 'custom';

export const TARGET_TYPE_SERVICE = 'service';
export const TARGET_TYPE_TEAM = 'team';
export const TARGET_TYPE_ESCALATION_POLICY = 'escalation_policy';
export const TARGET_TYPE_USER = 'user';
export const TARGET_TYPE_FUNCTIONALITY = 'functionality';

export const MAX_WEBHOOK_URL_LENGTH = 2048;
export const MAX_SECRET_LENGTH = 1024;
export const MAX_CATALOG_LENGTH = 1024;
export const MAX_TARGET_ID_LENGTH = 512;
export const MAX_LABEL_NAME_LENGTH = 1024;
export const MAX_LABELS = 100;
