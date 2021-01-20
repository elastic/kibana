/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { SharedGlobalConfig } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { getSavedObjectsCounts, KibanaSavedObjectCounts } from './get_saved_object_counts';

interface KibanaUsage extends KibanaSavedObjectCounts {
  index: string;
}

export function getKibanaUsageCollector(
  usageCollection: UsageCollectionSetup,
  legacyConfig$: Observable<SharedGlobalConfig>
) {
  return usageCollection.makeUsageCollector<KibanaUsage>({
    type: 'kibana',
    isReady: () => true,
    schema: {
      index: { type: 'keyword' },
      dashboard: { total: { type: 'long' } },
      visualization: { total: { type: 'long' } },
      search: { total: { type: 'long' } },
      index_pattern: { total: { type: 'long' } },
      graph_workspace: { total: { type: 'long' } },
      timelion_sheet: { total: { type: 'long' } },
    },
    async fetch({ esClient }) {
      const {
        kibana: { index },
      } = await legacyConfig$.pipe(take(1)).toPromise();
      return {
        index,
        ...(await getSavedObjectsCounts(esClient, index)),
      };
    },
  });
}

export function registerKibanaUsageCollector(
  usageCollection: UsageCollectionSetup,
  legacyConfig$: Observable<SharedGlobalConfig>
) {
  usageCollection.registerCollector(getKibanaUsageCollector(usageCollection, legacyConfig$));
}
