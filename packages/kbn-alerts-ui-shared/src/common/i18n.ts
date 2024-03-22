/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const PRODUCER_DISPLAY_NAMES = {
  apm: i18n.translate('alertsUiShared.producerDisplayNames.apm', {
    defaultMessage: 'APM and User Experience',
  }),
  uptime: i18n.translate('alertsUiShared.producerDisplayNames.uptime', {
    defaultMessage: 'Synthetics and Uptime',
  }),
  stackAlerts: i18n.translate('alertsUiShared.producerDisplayNames.stackAlerts', {
    defaultMessage: 'Stack Alerts',
  }),
  metrics: i18n.translate('alertsUiShared.producerDisplayNames.metrics', {
    defaultMessage: 'Metrics',
  }),
  logs: i18n.translate('alertsUiShared.producerDisplayNames.logs', {
    defaultMessage: 'Logs',
  }),
  siem: i18n.translate('alertsUiShared.producerDisplayNames.siem', {
    defaultMessage: 'Security',
  }),
  observability: i18n.translate('alertsUiShared.producerDisplayNames.observability', {
    defaultMessage: 'Observability',
  }),
  ml: i18n.translate('alertsUiShared.producerDisplayNames.ml', {
    defaultMessage: 'Machine Learning',
  }),
  slo: i18n.translate('alertsUiShared.producerDisplayNames.slo', {
    defaultMessage: 'SLOs',
  }),
  infrastructure: i18n.translate('alertsUiShared.producerDisplayNames.infrastructure', {
    defaultMessage: 'Infrastructure',
  }),
  monitoring: i18n.translate('alertsUiShared.producerDisplayNames.monitoring', {
    defaultMessage: 'Stack Monitoring',
  }),
};
