/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  CORE_USAGE_STATS_TYPE,
  CORE_USAGE_STATS_ID,
  REPOSITORY_RESOLVE_OUTCOME_STATS,
  type InternalCoreUsageDataSetup,
} from '@kbn/core-usage-data-base-server-internal';
export { CoreUsageDataService } from './core_usage_data_service';
export { CoreUsageStatsClient } from './core_usage_stats_client';

// Because of #79265 we need to explicitly import, then export these types for
// scripts/telemetry_check.js to work as expected
import type {
  CoreUsageStats,
  CoreUsageData,
  CoreConfigUsageData,
  CoreEnvironmentUsageData,
  CoreServicesUsageData,
  ConfigUsageData,
  CoreUsageDataStart,
  CoreUsageDataSetup,
  CoreUsageCounter,
  CoreIncrementUsageCounter,
  CoreIncrementCounterParams,
} from '@kbn/core-usage-data-server';

export type {
  CoreUsageStats,
  CoreUsageData,
  CoreConfigUsageData,
  CoreEnvironmentUsageData,
  CoreServicesUsageData,
  ConfigUsageData,
  CoreUsageDataStart,
  CoreUsageDataSetup,
  CoreUsageCounter,
  CoreIncrementUsageCounter,
  CoreIncrementCounterParams,
};
