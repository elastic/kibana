/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient, ScoutLogger } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';
import { USAGE_COUNTER_SAVED_OBJECT_TYPE } from '../fixtures/constants';

export interface UsageCounter {
  id: string;
  attributes: { domainId: string; counterName: string; counterType: string; count: number };
}

export interface UsageCountersApiService {
  /** Finds the stored usage counters of one counter name in one domain. */
  find: (params: { domainId: string; counterName: string }) => Promise<UsageCounter[]>;
}

export const getUsageCountersApiService = ({
  log,
  kbnClient,
}: {
  log: ScoutLogger;
  kbnClient: KbnClient;
}): UsageCountersApiService => ({
  find: async ({ domainId, counterName }) =>
    measurePerformanceAsync(log, 'usageCounters.find', async () => {
      const attributes = `${USAGE_COUNTER_SAVED_OBJECT_TYPE}.attributes`;
      const { data } = await kbnClient.request<{ saved_objects: UsageCounter[] }>({
        method: 'GET',
        path: '/api/saved_objects/_find',
        query: {
          type: USAGE_COUNTER_SAVED_OBJECT_TYPE,
          filter: `${attributes}.domainId: "${domainId}" and ${attributes}.counterName: "${counterName}"`,
        },
      });
      return data.saved_objects;
    }),
});
