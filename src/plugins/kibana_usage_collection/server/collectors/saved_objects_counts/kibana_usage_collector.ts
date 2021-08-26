/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';
import type { ElasticsearchClient, SharedGlobalConfig } from 'src/core/server';
import type { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { take } from 'rxjs/operators';
import { snakeCase } from 'lodash';
import { getSavedObjectsCounts } from './get_saved_object_counts';

interface KibanaSavedObjectCounts {
  dashboard: { total: number };
  visualization: { total: number };
  search: { total: number };
  index_pattern: { total: number };
  graph_workspace: { total: number };
  timelion_sheet: { total: number };
}

interface KibanaUsage extends KibanaSavedObjectCounts {
  index: string;
}

const TYPES = [
  'dashboard',
  'visualization',
  'search',
  'index-pattern',
  'graph-workspace',
  'timelion-sheet',
];

export async function getKibanaSavedObjectCounts(
  esClient: ElasticsearchClient,
  kibanaIndex: string
): Promise<KibanaSavedObjectCounts> {
  const buckets = await getSavedObjectsCounts(esClient, kibanaIndex, TYPES);

  const allZeros = (Object.fromEntries(
    TYPES.map((type) => [snakeCase(type), { total: 0 }])
  ) as unknown) as KibanaSavedObjectCounts;

  return buckets.reduce((acc, { key, doc_count: total = 0 }) => {
    const type = snakeCase(key) as keyof KibanaSavedObjectCounts;
    acc[type].total += total;
    return acc;
  }, allZeros);
}

export function registerKibanaUsageCollector(
  usageCollection: UsageCollectionSetup,
  legacyConfig$: Observable<SharedGlobalConfig>
) {
  usageCollection.registerCollector(
    usageCollection.makeUsageCollector<KibanaUsage>({
      type: 'kibana',
      isReady: () => true,
      schema: {
        index: { type: 'keyword', _meta: { description: 'The index storing the saved objects' } },
        dashboard: {
          total: {
            type: 'long',
            _meta: { description: 'Total number of dashboard saved objects' },
          },
        },
        visualization: {
          total: {
            type: 'long',
            _meta: { description: 'Total number of visualization saved objects' },
          },
        },
        search: {
          total: { type: 'long', _meta: { description: 'Total number of search saved objects' } },
        },
        index_pattern: {
          total: {
            type: 'long',
            _meta: { description: 'Total number of index_pattern saved objects' },
          },
        },
        graph_workspace: {
          total: {
            type: 'long',
            _meta: { description: 'Total number of graph_workspace saved objects' },
          },
        },
        timelion_sheet: {
          total: {
            type: 'long',
            _meta: { description: 'Total number of timelion_sheet saved objects' },
          },
        },
      },
      async fetch({ esClient }) {
        const {
          kibana: { index },
        } = await legacyConfig$.pipe(take(1)).toPromise();
        return {
          index,
          ...(await getKibanaSavedObjectCounts(esClient, index)),
        };
      },
    })
  );
}
