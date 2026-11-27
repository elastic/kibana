/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiServicesFixture } from '@kbn/scout';
import { apiTest as baseApiTest } from '@kbn/scout';
import {
  getUsageCountersApiService,
  type UsageCountersApiService,
} from '../services/usage_counters_api_service';

declare module '@kbn/scout' {
  interface ApiServicesFixture {
    usageCounters: UsageCountersApiService;
  }
}

export const apiTest = baseApiTest.extend<{}, { apiServices: ApiServicesFixture }>({
  apiServices: [
    async ({ apiServices, kbnClient, log }, use) => {
      await use(
        Object.assign(apiServices, {
          usageCounters: getUsageCountersApiService({ kbnClient, log }),
        })
      );
    },
    { scope: 'worker' },
  ],
});

export * as testData from './constants';
export { legacyStatsResponseSchema, statsResponseSchema } from './stats_schema';
export { createUiCounterEvent, toTypeAndCount, uniqueEventName } from './ui_counters';
