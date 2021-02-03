/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

import { getStats, VisualizationUsage } from './get_usage_collector';

export function registerVisualizationsCollector(
  collectorSet: UsageCollectionSetup,
  config: Observable<{ kibana: { index: string } }>
) {
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
    fetch: async ({ esClient }) => {
      const index = (await config.pipe(first()).toPromise()).kibana.index;
      return await getStats(esClient, index);
    },
  });
  collectorSet.registerCollector(collector);
}
