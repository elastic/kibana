/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreUsageStats } from './core_usage_stats';
import type {
  CoreConfigUsageData,
  CoreEnvironmentUsageData,
  CoreServicesUsageData,
} from './core_usage_data';

/**
 * Internal API for getting Core's usage data payload.
 *
 * @note This API should never be used to drive application logic and is only
 * intended for telemetry purposes.
 *
 * @public
 */
export interface CoreUsageDataStart {
  /**
   * Internal API for getting Core's usage data payload.
   *
   * @note This API should never be used to drive application logic and is only
   * intended for telemetry purposes.
   *
   * @internal
   * */
  getCoreUsageData(): Promise<CoreUsageData>;

  getConfigsUsageData(): Promise<ConfigUsageData>;
}

/**
 * Type describing Core's usage data payload
 * @public
 */
export interface CoreUsageData extends CoreUsageStats {
  config: CoreConfigUsageData;
  services: CoreServicesUsageData;
  environment: CoreEnvironmentUsageData;
}

/**
 * Type describing Core's usage data payload
 * @public
 */
export type ConfigUsageData = Record<string, any | any[]>;
