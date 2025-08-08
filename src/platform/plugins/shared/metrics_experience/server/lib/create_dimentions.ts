/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

interface CreateDimensionsParams {
  esClient: ElasticsearchClient;
  dimensions: string[];
  indices?: string[];
  from?: string;
  to?: string;
  logger: Logger;
}

interface TermsBucket {
  key: string;
  doc_count: number;
}

interface AggregationsResponse {
  [dimension: string]: {
    buckets: TermsBucket[];
  };
}

export const createDimensions = async ({
  esClient,
  dimensions,
  indices = ['metrics-*'],
  from,
  to,
  logger,
}: CreateDimensionsParams): Promise<Array<{ value: string; field: string }>> => {
  if (!dimensions || dimensions.length === 0) {
    return [];
  }

  // Build time range filter if provided
  const timeRangeFilter =
    from && to
      ? [
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
                format: 'strict_date_optional_time',
              },
            },
          },
        ]
      : [];

  // Create aggregations for each dimension
  const aggs: Record<string, object> = {};
  dimensions.forEach((dimension) => {
    aggs[dimension] = {
      terms: {
        field: dimension,
        size: 20,
        order: { _key: 'asc' },
      },
    };
  });

  try {
    const response = await esClient.search<unknown, AggregationsResponse>({
      index: indices.join(','),
      size: 0,
      query: {
        bool: {
          filter: timeRangeFilter,
        },
      },
      aggs,
    });

    // Extract values from aggregations
    const values: Array<{ value: string; field: string }> = [];
    const aggregations: AggregationsResponse | undefined = response.aggregations;

    if (aggregations) {
      dimensions.forEach((dimension) => {
        const agg = aggregations[dimension];
        const buckets = agg?.buckets ?? [];
        buckets.forEach((bucket) => {
          values.push({
            value: bucket.key,
            field: dimension,
          });
        });
      });
    }

    return values;
  } catch (error) {
    logger.error('Error fetching dimension values:', error);
    return [];
  }
};
