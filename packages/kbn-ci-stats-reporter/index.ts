/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  CiStatsMetric,
  CiStatsReportTestsOptions,
  CiStatsTiming,
  MetricsOptions,
  TimingsOptions,
} from './src/ci_stats_reporter';
export { CiStatsReporter } from './src/ci_stats_reporter';
export { getTimeReporter } from './src/report_time';
export type {
  CiStatsTestGroupInfo,
  CiStatsTestResult,
  CiStatsTestRun,
  CiStatsTestType,
} from './src/ci_stats_test_group_types';
