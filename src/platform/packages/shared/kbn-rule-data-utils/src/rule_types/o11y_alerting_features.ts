/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AlertConsumers, DEPRECATED_ALERTING_CONSUMERS } from '../alerts_as_data_rbac';
import {
  ApmRuleType,
  LOG_THRESHOLD_ALERT_TYPE_ID,
  METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  SLO_BURN_RATE_RULE_TYPE_ID,
  SYNTHETICS_RULE_TYPE_IDS,
  UPTIME_RULE_TYPE_IDS,
} from './o11y_rules';
import { ES_QUERY_ID, ML_ANOMALY_DETECTION_RULE_TYPE_ID } from './stack_rules';

export const buildAlertingFeatureEntries = (
  ruleTypeIds: readonly string[],
  primaryConsumers: string[]
) =>
  ruleTypeIds.map((ruleTypeId) => ({
    ruleTypeId,
    consumers: [...primaryConsumers, AlertConsumers.ALERTS, ...DEPRECATED_ALERTING_CONSUMERS],
  }));

const SHARED_OBS_RULE_TYPE_IDS = [
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
  ES_QUERY_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
];

export const APM_ALERTING_FEATURES = buildAlertingFeatureEntries(Object.values(ApmRuleType), [
  AlertConsumers.APM,
]);

export const METRIC_ALERTING_FEATURES = buildAlertingFeatureEntries(
  [METRIC_THRESHOLD_ALERT_TYPE_ID, METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID],
  [AlertConsumers.INFRASTRUCTURE]
);

export const METRIC_ALERTING_FEATURES_WITH_SHARED = buildAlertingFeatureEntries(
  [
    METRIC_THRESHOLD_ALERT_TYPE_ID,
    METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
    ...SHARED_OBS_RULE_TYPE_IDS,
  ],
  [AlertConsumers.INFRASTRUCTURE]
);

export const LOG_ALERTING_FEATURES = buildAlertingFeatureEntries(
  [LOG_THRESHOLD_ALERT_TYPE_ID],
  [AlertConsumers.LOGS]
);

export const LOG_ALERTING_FEATURES_WITH_SHARED = buildAlertingFeatureEntries(
  [LOG_THRESHOLD_ALERT_TYPE_ID, ...SHARED_OBS_RULE_TYPE_IDS],
  [AlertConsumers.LOGS]
);

export const SLO_ALERTING_FEATURES = buildAlertingFeatureEntries(
  [SLO_BURN_RATE_RULE_TYPE_ID],
  [AlertConsumers.SLO]
);

export const SYNTHETICS_ALERTING_FEATURES = buildAlertingFeatureEntries(
  [...UPTIME_RULE_TYPE_IDS, ...SYNTHETICS_RULE_TYPE_IDS],
  [AlertConsumers.UPTIME]
);

export const SHARED_OBS_ALERTING_FEATURES = buildAlertingFeatureEntries(
  SHARED_OBS_RULE_TYPE_IDS,
  [AlertConsumers.INFRASTRUCTURE, AlertConsumers.LOGS]
);

export const OBS_ALERTING_FEATURES = [
  ...APM_ALERTING_FEATURES,
  ...METRIC_ALERTING_FEATURES,
  ...LOG_ALERTING_FEATURES,
  ...SHARED_OBS_ALERTING_FEATURES,
  ...SLO_ALERTING_FEATURES,
  ...SYNTHETICS_ALERTING_FEATURES,
];
