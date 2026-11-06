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
import { STACK_ALERTING_FEATURES } from './stack_alerting_features';
import {
  ES_QUERY_ID,
  INDEX_THRESHOLD_ID,
  ML_ANOMALY_DETECTION_RULE_TYPE_ID,
  STACK_ALERTS_FEATURE_ID,
} from './stack_rules';

const consumersOf = (ruleTypeId: string): string[] =>
  STACK_ALERTING_FEATURES.find((entry) => entry.ruleTypeId === ruleTypeId)?.consumers ?? [];

describe('STACK_ALERTING_FEATURES', () => {
  it('grants every entry the stackAlerts consumer', () => {
    for (const { consumers } of STACK_ALERTING_FEATURES) {
      expect(consumers).toContain(STACK_ALERTS_FEATURE_ID);
    }
  });

  it('grants the alerts consumer only to the rule types that accept it', () => {
    expect(consumersOf(INDEX_THRESHOLD_ID)).toContain(AlertConsumers.ALERTS);
    expect(consumersOf(ES_QUERY_ID)).toContain(AlertConsumers.ALERTS);
    expect(consumersOf(ML_ANOMALY_DETECTION_RULE_TYPE_ID)).not.toContain(AlertConsumers.ALERTS);
    expect(consumersOf(OBSERVABILITY_THRESHOLD_RULE_TYPE_ID)).not.toContain(AlertConsumers.ALERTS);
  });

  it('keeps the Discover consumer for legacy ES query rules', () => {
    expect(consumersOf(ES_QUERY_ID)).toContain(AlertConsumers.DISCOVER);
  });
});
