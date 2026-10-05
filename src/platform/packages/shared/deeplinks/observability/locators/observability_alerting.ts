/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_ALERTS_PATH,
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../constants';

export interface ObservabilityAlertingV2PagePaths {
  rules: string;
  ruleLibrary: string;
  alerts: string;
  actionPolicies: string;
  executionHistory: string;
}

/** Builds an Alerting v2 host for the Observability Alerting mount. */
export const createObservabilityAlertingV2Host = <THost>(
  createHost: (appId: string, pagePathPrefixes: ObservabilityAlertingV2PagePaths) => THost
): THost =>
  createHost(OBSERVABILITY_ALERTING_APP_ID, {
    rules: OBSERVABILITY_ALERTING_RULES_V2_PATH,
    ruleLibrary: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
    alerts: OBSERVABILITY_ALERTING_ALERTS_PATH,
    actionPolicies: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
    executionHistory: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  });
