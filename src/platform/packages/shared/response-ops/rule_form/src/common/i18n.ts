/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const PRODUCER_DISPLAY_NAMES = {
  apm: i18n.translate('responseOpsRuleForm.producerDisplayNames.apm', {
    defaultMessage: 'APM and User Experience',
  }),
  uptime: i18n.translate('responseOpsRuleForm.producerDisplayNames.uptime', {
    defaultMessage: 'Synthetics and Uptime',
  }),
  stackAlerts: i18n.translate('responseOpsRuleForm.producerDisplayNames.stackAlerts', {
    defaultMessage: 'Stack Alerts',
  }),
  metrics: i18n.translate('responseOpsRuleForm.producerDisplayNames.metrics', {
    defaultMessage: 'Metrics',
  }),
  logs: i18n.translate('responseOpsRuleForm.producerDisplayNames.logs', {
    defaultMessage: 'Logs',
  }),
  siem: i18n.translate('responseOpsRuleForm.producerDisplayNames.siem', {
    defaultMessage: 'Security',
  }),
  observability: i18n.translate('responseOpsRuleForm.producerDisplayNames.observability', {
    defaultMessage: 'Observability',
  }),
  ml: i18n.translate('responseOpsRuleForm.producerDisplayNames.ml', {
    defaultMessage: 'Machine Learning',
  }),
  slo: i18n.translate('responseOpsRuleForm.producerDisplayNames.slo', {
    defaultMessage: 'SLOs',
  }),
  infrastructure: i18n.translate('responseOpsRuleForm.producerDisplayNames.infrastructure', {
    defaultMessage: 'Infrastructure',
  }),
  monitoring: i18n.translate('responseOpsRuleForm.producerDisplayNames.monitoring', {
    defaultMessage: 'Stack Monitoring',
  }),
};
