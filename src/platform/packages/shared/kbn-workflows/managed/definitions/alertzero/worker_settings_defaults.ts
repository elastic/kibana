/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Fresh-install defaults for Worker settings the YAML templates substitute.
 * `@kbn/workflows` cannot import `@kbn/alertzero-common` (that package imports this one),
 * so the numbers and schedule strings live here and the declarations import them.
 * One source: a template fill and a read-path fill that each hardcode the value would drift.
 */

export const ATTACK_DISCOVERY_SCHEDULE_INTERVAL_DEFAULT = '24h';

export const RULE_TUNING_SCHEDULE_INTERVAL_DEFAULT = '2h';

export const RULE_TUNING_ANALYSIS_WINDOW_DAYS_DEFAULT = 7;
export const RULE_TUNING_FP_COUNT_THRESHOLD_DEFAULT = 10;
export const RULE_TUNING_FP_RATE_THRESHOLD_PCT_DEFAULT = 50;

export const RULE_TUNING_EXTRAS_DEFAULTS = {
  analysisWindowDays: RULE_TUNING_ANALYSIS_WINDOW_DAYS_DEFAULT,
  fpCountThreshold: RULE_TUNING_FP_COUNT_THRESHOLD_DEFAULT,
  fpRateThresholdPct: RULE_TUNING_FP_RATE_THRESHOLD_PCT_DEFAULT,
};
