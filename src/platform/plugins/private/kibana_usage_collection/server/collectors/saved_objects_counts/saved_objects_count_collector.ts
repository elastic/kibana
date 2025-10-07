/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { getSavedObjectsCounts } from './get_saved_object_counts';

interface SavedObjectsCountUsageByType {
  type: string;
  count: number;
}

interface SavedObjectsCountUsage {
  total: number;
  others: number;
  by_type: SavedObjectsCountUsageByType[];
  non_registered_types: string[];
  by_access_control_type: SavedObjectsCountUsageByType[];
}

export function registerSavedObjectsCountUsageCollector(
  usageCollection: UsageCollectionSetup,
  getAllSavedObjectTypes: () => Promise<string[]>,
  getSoClientWithHiddenIndices: () => Promise<SavedObjectsClientContract>,
  getAllTypesWithAccessControl: () => Promise<string[]>
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
        by_access_control_type: {
          type: 'array',
          items: {
            type: {
              type: 'keyword',
              _meta: { description: 'The SavedObjects types supporting access control' },
            },
            count: {
              type: 'long',
              _meta: {
                description:
                  'How many SavedObjects of that type are stored in the cluster across all Spaces',
              },
            },
          },
        },
        others: {
          type: 'long',
          _meta: {
            description:
              'Number of SO objects outside the breakdown. If it is not 0, there may be an unexpected state of the deployment 0 and future migrations might fail.',
          },
        },
        non_registered_types: {
          type: 'array',
          items: {
            type: 'keyword',
            _meta: {
              description:
                'List of SO types that showed up in the break down but are not registered in Kibana. They could be a potential cause of future migration failures.',
            },
          },
        },
      },
      async fetch() {
        const soClient = await getSoClientWithHiddenIndices();
        const allRegisteredSOTypes = await getAllSavedObjectTypes();
        const allTypesWithAccessControl = await getAllTypesWithAccessControl();
        const namespaces = ['*'];
        const {
          total,
          per_type: buckets,
          non_expected_types: nonRegisteredTypes,
          by_access_control_type: accessControlBuckets,
          others,
        } = await getSavedObjectsCounts(soClient, allRegisteredSOTypes, {
          namespaces,
          exclusive: false,
          typesSupportingAccessControl: allTypesWithAccessControl,
        });

        return {
          total,
          by_type: buckets.map(({ key: type, doc_count: count }) => ({ type, count })),
          non_registered_types: nonRegisteredTypes,
          by_access_control_type: accessControlBuckets.map(({ key: type, doc_count: count }) => ({
            type,
            count,
          })),
          others,
        };
      },
    })
  );
}
