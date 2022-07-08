/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { getSavedObjectsCounts } from './get_saved_object_counts';

interface SavedObjectsCountUsageByType {
  type: string;
  count: number;
}

interface SavedObjectsCountUsage {
  total: number;
  by_type: SavedObjectsCountUsageByType[];
}

export function registerSavedObjectsCountUsageCollector(
  usageCollection: UsageCollectionSetup,
  kibanaIndex: string,
  getAllSavedObjectTypes: () => Promise<string[]>
) {
  usageCollection.registerCollector(
    usageCollection.makeUsageCollector<SavedObjectsCountUsage>({
      type: 'saved_objects_counts',
      isReady: () => true,
      schema: {
        total: {
          type: 'long',
          _meta: {
            description: 'Total number of saved objects in the cluster',
          },
        },
        by_type: {
          type: 'array',
          items: {
            type: { type: 'keyword', _meta: { description: 'The SavedObjects type' } },
            count: {
              type: 'long',
              _meta: {
                description:
                  'How many SavedObjects of that type are stored in the cluster across all Spaces',
              },
            },
          },
        },
      },
      async fetch({ esClient }) {
        const allRegisteredSOTypes = await getAllSavedObjectTypes();
        const { total, per_type: buckets } = await getSavedObjectsCounts(
          esClient,
          kibanaIndex,
          allRegisteredSOTypes
        );
        return {
          total,
          by_type: buckets.map(({ key: type, doc_count: count }) => {
            return { type, count };
          }),
        };
      },
    })
  );
}
