/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { dateRangeQuery } from '@kbn/es-query';
import { parse } from '@kbn/datemath';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { estypes } from '@elastic/elasticsearch';

interface CreateDimensionsParams {
  esClient: ElasticsearchClient;
  dimensions: string[];
  indices?: string[];
  from?: string;
  to?: string;
  logger: Logger;
}
interface AggregationsResponse {
  [dimension: string]: {
    buckets: estypes.AggregationsStringTermsBucketKeys[];
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

  if (dimensions.length > 10) {
    logger.error(
      `Too many dimensions requested, maximum is 10 and the requested dimensions are: ${dimensions.length}`
    );
    return [];
  }

  const timeRangeFilter: QueryDslQueryContainer[] = [];

  if (from && to) {
    const start = parse(from);
    const end = parse(to, { roundUp: true });

    // Build time range filter if provided
    if (start && end) {
      timeRangeFilter.push(dateRangeQuery(start.valueOf(), end.valueOf(), '@timestamp')[0]);
    }
  }
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
            value: String(bucket.key ?? ''),
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
