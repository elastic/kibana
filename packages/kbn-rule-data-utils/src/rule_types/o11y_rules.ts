/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const OBSERVABILITY_THRESHOLD_RULE_TYPE_ID = 'observability.rules.custom_threshold';

/**
 * APM rule types
 */

export enum ApmRuleType {
  ErrorCount = 'apm.error_rate', // ErrorRate was renamed to ErrorCount but the key is kept as `error_rate` for backwards-compat.
  TransactionErrorRate = 'apm.transaction_error_rate',
  TransactionDuration = 'apm.transaction_duration',
  Anomaly = 'apm.anomaly',
}

export const APM_RULE_TYPE_IDS = Object.values(ApmRuleType);

/**
 * Synthetics ryle types
 */

export const SYNTHETICS_STATUS_RULE = 'xpack.synthetics.alerts.monitorStatus';
export const SYNTHETICS_TLS_RULE = 'xpack.synthetics.alerts.tls';

export const SYNTHETICS_ALERT_RULE_TYPES = {
  MONITOR_STATUS: SYNTHETICS_STATUS_RULE,
  TLS: SYNTHETICS_TLS_RULE,
};

export const SYNTHETICS_RULE_TYPE_IDS = [SYNTHETICS_STATUS_RULE, SYNTHETICS_TLS_RULE];

/**
 * SLO rule types
 */
export const SLO_BURN_RATE_RULE_TYPE_ID = 'slo.rules.burnRate';
export const SLO_RULE_TYPE_IDS = [SLO_BURN_RATE_RULE_TYPE_ID];

/**
 * Metrics rule types
 */
export const METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.inventory.threshold';
export const METRIC_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.threshold';

/**
 * Logs rule types
 */
export const LOG_THRESHOLD_ALERT_TYPE_ID = 'logs.alert.document.count';
export const LOG_RULE_TYPE_IDS = [LOG_THRESHOLD_ALERT_TYPE_ID];

/**
 * Uptime rule types
 */

export const UPTIME_RULE_TYPE_IDS = [
  'xpack.uptime.alerts.tls',
  'xpack.uptime.alerts.tlsCertificate',
  'xpack.uptime.alerts.monitorStatus',
  'xpack.uptime.alerts.durationAnomaly',
];

/**
 * Infra rule types
 */

export enum InfraRuleType {
  MetricThreshold = 'metrics.alert.threshold',
  InventoryThreshold = 'metrics.alert.inventory.threshold',
}

export const INFRA_RULE_TYPE_IDS = Object.values(InfraRuleType);

export const OBSERVABILITY_RULE_TYPE_IDS = [
  ...APM_RULE_TYPE_IDS,
  ...SYNTHETICS_RULE_TYPE_IDS,
  ...INFRA_RULE_TYPE_IDS,
  ...UPTIME_RULE_TYPE_IDS,
  ...LOG_RULE_TYPE_IDS,
  ...SLO_RULE_TYPE_IDS,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
];
