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
  metrics: Array<{ name: string; index: string }>;
}

export const getDimensions = async ({
  esClient,
  dimensions,
  indices,
  from,
  to,
  logger,
  metrics,
}: CreateDimensionsParams): Promise<
  Array<{ value: string; field: string; valueMetrics: string[] }>
> => {
  if (!dimensions || dimensions.length === 0) {
    return [];
  }

  try {
    const response = await esClient.search('get_dimensions', {
      index: indices.join(','),
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [...dateRangeQuery(from, to)],
        },
      },
      // Create aggregations for each dimension
      aggs: dimensions.reduce((dimAcc, currDimension) => {
        dimAcc[currDimension] = {
          terms: {
            field: currDimension,
            size: 20,
            order: { _key: 'asc' },
          },
          aggs: metrics.reduce((metAcc, metric) => {
            metAcc[metric.name] = {
              filter: {
                bool: {
                  must: [{ exists: { field: metric.name } }, { term: { _index: metric.index } }],
                },
              },
            };
            return metAcc;
          }, {} as Record<string, Pick<estypes.AggregationsAggregationContainer, 'filter'>>),
        };

        return dimAcc;
      }, {} as Record<string, Pick<estypes.AggregationsAggregationContainer, 'terms'> & { aggs: Record<string, Pick<estypes.AggregationsAggregationContainer, 'filter'>> }>),
    });

    const aggregations = response.aggregations;

    const values = dimensions.flatMap((dimension) => {
      const agg = aggregations?.[dimension];
      return (
        agg?.buckets?.map((bucket) => ({
          value: String(bucket.key ?? ''),
          field: dimension,
          valueMetrics: [
            ...new Set(
              metrics
                .filter((metric) => bucket[metric.name]?.doc_count > 0)
                .map((metric) => metric.name)
            ),
          ],
        })) ?? []
      );
    });

    return values;
  } catch (error) {
    logger.error('Error fetching dimension values:', error);
    return [];
  }
};
