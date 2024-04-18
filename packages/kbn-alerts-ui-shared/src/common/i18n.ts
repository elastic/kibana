/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const PRODUCER_DISPLAY_NAMES = {
  apm: i18n.translate('alertsUIShared.producerDisplayNames.apm', {
    defaultMessage: 'APM and User Experience',
  }),
  uptime: i18n.translate('alertsUIShared.producerDisplayNames.uptime', {
    defaultMessage: 'Synthetics and Uptime',
  }),
  stackAlerts: i18n.translate('alertsUIShared.producerDisplayNames.stackAlerts', {
    defaultMessage: 'Stack Alerts',
  }),
  metrics: i18n.translate('alertsUIShared.producerDisplayNames.metrics', {
    defaultMessage: 'Metrics',
  }),
  logs: i18n.translate('alertsUIShared.producerDisplayNames.logs', {
    defaultMessage: 'Logs',
  }),
  siem: i18n.translate('alertsUIShared.producerDisplayNames.siem', {
    defaultMessage: 'Security',
  }),
  observability: i18n.translate('alertsUIShared.producerDisplayNames.observability', {
    defaultMessage: 'Observability',
  }),
  ml: i18n.translate('alertsUIShared.producerDisplayNames.ml', {
    defaultMessage: 'Machine Learning',
  }),
  slo: i18n.translate('alertsUIShared.producerDisplayNames.slo', {
    defaultMessage: 'SLOs',
  }),
  infrastructure: i18n.translate('alertsUIShared.producerDisplayNames.infrastructure', {
    defaultMessage: 'Infrastructure',
  }),
  monitoring: i18n.translate('alertsUIShared.producerDisplayNames.monitoring', {
    defaultMessage: 'Stack Monitoring',
  }),
};
