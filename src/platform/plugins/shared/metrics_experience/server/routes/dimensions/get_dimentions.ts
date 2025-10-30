/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { dateRangeQuery } from '@kbn/es-query';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import type { estypes } from '@elastic/elasticsearch';

interface CreateDimensionsParams {
  esClient: TracedElasticsearchClient;
  dimensions: string[];
  indices: string[];
  from: number;
  to: number;

  logger: Logger;
}

export const getDimensions = async ({
  esClient,
  dimensions,
  indices,
  from,
  to,
  logger,
}: CreateDimensionsParams): Promise<Array<{ value: string; field: string; scopes: string[] }>> => {
  if (!dimensions || dimensions.length === 0) {
    return [];
  }

  // const source = fromCommand(indices);
  // const query = source
  //   .pipe(
  //     evaluate('??dim = ??dim::string', { dim: dimensions[0] }),
  //     where('??dim IS NOT NULL', { dim: dimensions[0] }),
  //     stats('distinct_datasets = VALUES(data_stream.dataset) BY ??dim', {
  //       dim: dimensions[0],
  //     }),
  //     sort('??dim', { dim: dimensions[0] }),
  //     limit(1000)
  //   )
  //   .toString();

  // try {
  //   const response = await esClient.esql(
  //     'get_dimensions',
  //     {
  //       query: query.toString(),
  //       filter: {
  //         bool: {
  //           filter: [...dateRangeQuery(from, to)],
  //         },
  //       },
  //     },
  //     {
  //       transform: 'plain',
  //     }
  // );

  // return response.hits.map((hit) => ({
  //   value: String(hit[dimensions[0]]),
  //   field: dimensions[0],
  //   dataSets: hit.distinct_datasets as string[],
  // }));

  try {
    const dimensionAggs = dimensions.reduce((acc, currDimension) => {
      acc[currDimension] = {
        terms: {
          field: currDimension,
          size: 1000,
          order: {
            _key: 'asc',
          },
        },
        aggs: {
          by_scope: {
            multi_terms: {
              terms: [
                // Semconv: scope.name identifies specific instrumentation library
                // Examples: io.opentelemetry.contrib.mongodb, io.opentelemetry.contrib.redis
                {
                  field: 'scope.name',
                  missing: '_none_',
                },
                // ECS: data_stream.dataset identifies the data source/scraper
                // Examples: system.cpu, kubernetes.pod, docker.container
                {
                  field: 'data_stream.dataset',
                },
              ],
              size: 50,
            },
          },
        },
      };

      return acc;
    }, {} as Record<string, Pick<estypes.AggregationsAggregationContainer, 'terms' | 'aggs'>>);

    const response = await esClient.search('get_dimensions', {
      index: indices.join(','),
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [...dateRangeQuery(from, to)],
        },
      },
      aggs: dimensionAggs,
    });

    const aggregations = response.aggregations as Record<
      string,
      estypes.AggregationsMultiBucketAggregateBase<
        estypes.AggregationsStringTermsBucket & {
          by_scope?: estypes.AggregationsMultiBucketAggregateBase<estypes.AggregationsStringTermsBucket>;
        }
      >
    >;

    const values = dimensions.flatMap((dimension) => {
      const agg = aggregations?.[dimension];
      const buckets = Array.isArray(agg?.buckets) ? agg.buckets : [];

      return (
        buckets
          .filter((bucket) => !!bucket.key)
          .map((bucket) => {
            const byScopeBuckets = Array.isArray(bucket.by_scope?.buckets)
              ? bucket.by_scope?.buckets
              : [];

            return {
              value: String(bucket.key ?? ''),
              field: dimension,
              scopes: byScopeBuckets.map((scope) => String(scope.key_as_string ?? '')),
            };
          }) ?? []
      );
    });

    return values;
  } catch (error) {
    logger.error('Error fetching dimension values:', error);
    return [];
  }
};
