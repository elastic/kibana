/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const FEATURE_NO_PERMISSIONS_TITLE = i18n.translate('alerts.noPermissionsTitle', {
  defaultMessage: 'Kibana feature privileges required',
});

export const ALERTS_FEATURE_NO_PERMISSIONS_MSG = i18n.translate('alerts.noPermissionsMessage', {
  defaultMessage:
    'To view alerts, you must have privileges for the Alerts feature in the Kibana space. For more information, contact your Kibana administrator.',
});

export const GO_TO_DOCUMENTATION = i18n.translate('alerts.documentationTitle', {
  defaultMessage: 'View documentation',
});
