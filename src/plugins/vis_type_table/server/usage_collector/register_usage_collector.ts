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

import { getStats, VisTypeTableUsage } from './get_stats';

export function registerVisTypeTableUsageCollector(
  collectorSet: UsageCollectionSetup,
  config: Observable<{ kibana: { index: string } }>
) {
  const collector = collectorSet.makeUsageCollector<VisTypeTableUsage | undefined>({
    type: 'vis_type_table',
    isReady: () => true,
    schema: {
      total: { type: 'long' },
      total_split: { type: 'long' },
      split_columns: {
        total: { type: 'long' },
        enabled: { type: 'long' },
      },
      split_rows: {
        total: { type: 'long' },
        enabled: { type: 'long' },
      },
    },
    fetch: async ({ esClient }) => {
      const index = (await config.pipe(first()).toPromise()).kibana.index;
      return await getStats(esClient, index);
    },
  });
  collectorSet.registerCollector(collector);
}
