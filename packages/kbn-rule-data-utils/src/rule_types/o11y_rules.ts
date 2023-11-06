/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const OBSERVABILITY_THRESHOLD_RULE_TYPE_ID = 'observability.rules.custom_threshold';

export enum ApmRuleType {
  ErrorCount = 'apm.error_rate', // ErrorRate was renamed to ErrorCount but the key is kept as `error_rate` for backwards-compat.
  TransactionErrorRate = 'apm.transaction_error_rate',
  TransactionDuration = 'apm.transaction_duration',
  Anomaly = 'apm.anomaly',
}
