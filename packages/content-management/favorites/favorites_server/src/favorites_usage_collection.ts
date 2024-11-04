/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { estypes } from '@elastic/elasticsearch';
import { favoritesSavedObjectName } from './favorites_saved_object';

interface FavoritesUsage {
  [favorite_object_type: string]: {
    total: number;
    total_users_spaces: number;
    avg_per_user_per_space: number;
    max_per_user_per_space: number;
  };
}

export function registerFavoritesUsageCollection({
  core,
  usageCollection,
}: {
  core: CoreSetup;
  usageCollection: UsageCollectionSetup;
}) {
  usageCollection.registerCollector(
    usageCollection.makeUsageCollector<FavoritesUsage>({
      type: 'favorites',
      isReady: () => true,
      schema: {
        DYNAMIC_KEY /* e.g. 'dashboard' */: {
          total: {
            type: 'long',
            _meta: { description: 'Total favorite object count in this deployment' },
          },
          total_users_spaces: {
            type: 'long',
            _meta: {
              description:
                'Total users per space that have favorited an object of this type in this deployment',
            },
          },
          avg_per_user_per_space: {
            type: 'double',
            _meta: {
              description:
                'Average favorite objects count of this type per user per space for this deployment, only counts users who have favorited at least one object of this type',
            },
          },
          max_per_user_per_space: {
            type: 'long',
            _meta: {
              description:
                'Max favorite objects count of this type per user per space for this deployment',
            },
          },
        },
      },
      fetch: async (context) => {
        const favoritesIndex = await core
          .getStartServices()
          .then(([{ savedObjects }]) => savedObjects.getIndexForType(favoritesSavedObjectName));

        const response = await context.esClient.search<
          unknown,
          { types: estypes.AggregationsStringTermsAggregate }
        >({
          index: favoritesIndex,
          size: 0,
          _source: false,
          filter_path: ['aggregations'],
          query: {
            bool: {
              filter: [
                {
                  term: {
                    type: 'favorites',
                  },
                },
              ],
            },
          },
          runtime_mappings: {
            number_of_favorites: {
              type: 'long',
              script: {
                source: "emit(doc['favorites.favoriteIds'].length)",
              },
            },
          },
          aggs: {
            types: {
              terms: {
                field: 'favorites.type',
              },
              aggs: {
                stats: {
                  stats: {
                    field: 'number_of_favorites',
                  },
                },
              },
            },
          },
        });

        const favoritesUsage: FavoritesUsage = {};

        const typesBuckets = (response.aggregations?.types?.buckets ??
          []) as estypes.AggregationsStringTermsBucket[];

        typesBuckets.forEach((bucket) => {
          favoritesUsage[bucket.key] = {
            total: bucket.stats.sum,
            total_users_spaces: bucket.stats.count,
            avg_per_user_per_space: bucket.stats.avg,
            max_per_user_per_space: bucket.stats.max,
          };
        });

        return favoritesUsage;
      },
    })
  );
}
