/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { CORE_USAGE_STATS_TYPE, CORE_USAGE_STATS_ID } from './constants';
export type {
  InternalCoreUsageDataSetup,
  ConfigUsageData,
  CoreUsageDataStart,
  CoreUsageDataSetup,
  CoreUsageCounter,
  CoreIncrementUsageCounter,
  CoreIncrementCounterParams,
} from './types';
export { CoreUsageDataService } from './core_usage_data_service';
export { CoreUsageStatsClient, REPOSITORY_RESOLVE_OUTCOME_STATS } from './core_usage_stats_client';

// Because of #79265 we need to explicitly import, then export these types for
// scripts/telemetry_check.js to work as expected
import {
  CoreUsageStats,
  CoreUsageData,
  CoreConfigUsageData,
  CoreEnvironmentUsageData,
  CoreServicesUsageData,
} from './types';

export type {
  CoreUsageStats,
  CoreUsageData,
  CoreConfigUsageData,
  CoreEnvironmentUsageData,
  CoreServicesUsageData,
};
