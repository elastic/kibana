/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AlertConsumers } from '../alerts_as_data_rbac';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from './o11y_rules';
import {
  ES_QUERY_ID,
  GEO_CONTAINMENT_ID,
  INDEX_THRESHOLD_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  STACK_ALERTS_FEATURE_ID,
  TRANSFORM_HEALTH_ID,
} from './stack_rules';

const BASIC_STACK_ALERTING_FEATURES = [
  INDEX_THRESHOLD_ID,
  GEO_CONTAINMENT_ID,
  TRANSFORM_HEALTH_ID,
].map((ruleTypeId) => ({
  ruleTypeId,
  consumers: [STACK_ALERTS_FEATURE_ID, AlertConsumers.ALERTS],
}));

/**
 * The Discover consumer supports legacy ES query rules that were created with it.
 *
 * Issue: https://github.com/elastic/kibana/issues/184595
 */
const ES_QUERY_ALERTING_FEATURE = {
  ruleTypeId: ES_QUERY_ID,
  consumers: [STACK_ALERTS_FEATURE_ID, AlertConsumers.ALERTS, AlertConsumers.DISCOVER],
};

/**
 * Only the stackAlerts consumer is valid for these rule types under the Stack features.
 */
const STACK_ONLY_CONSUMER_ALERTING_FEATURES = [
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
].map((ruleTypeId) => ({ ruleTypeId, consumers: [STACK_ALERTS_FEATURE_ID] }));

/** Rule type and consumer combinations granted by the Stack Rules and Stack Alerts features. */
export const STACK_ALERTING_FEATURES = [
  ...BASIC_STACK_ALERTING_FEATURES,
  ES_QUERY_ALERTING_FEATURE,
  ...STACK_ONLY_CONSUMER_ALERTING_FEATURES,
];
