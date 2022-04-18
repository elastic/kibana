/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { getStats, VisualizationUsage } from './get_usage_collector';

export function registerVisualizationsCollector(collectorSet: UsageCollectionSetup) {
  const collector = collectorSet.makeUsageCollector<VisualizationUsage | undefined>({
    type: 'visualization_types',
    isReady: () => true,
    schema: {
      DYNAMIC_KEY: {
        total: { type: 'long' },
        spaces_min: { type: 'long' },
        spaces_max: { type: 'long' },
        spaces_avg: { type: 'long' },
        saved_7_days_total: { type: 'long' },
        saved_30_days_total: { type: 'long' },
        saved_90_days_total: { type: 'long' },
      },
    },
    fetch: async ({ soClient }) => await getStats(soClient),
  });
  collectorSet.registerCollector(collector);
}
