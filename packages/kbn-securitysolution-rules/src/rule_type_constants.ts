/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Id for the legacy siem signals alerting type
 */
export const SIGNALS_ID = `siem.signals` as const;

/**
 * IDs for alerts-as-data rule types
 */
const RULE_TYPE_PREFIX = `siem` as const;
export const EQL_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.eqlRule` as const;
export const INDICATOR_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.indicatorRule` as const;
export const ML_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.mlRule` as const;
export const QUERY_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.queryRule` as const;
export const SAVED_QUERY_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.savedQueryRule` as const;
export const THRESHOLD_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.thresholdRule` as const;
