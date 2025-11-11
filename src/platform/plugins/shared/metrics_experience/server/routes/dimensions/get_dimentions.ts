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
import { from as fromCommand, evaluate, where, stats, sort, limit } from '@kbn/esql-composer';

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
}: CreateDimensionsParams): Promise<Array<{ value: string; field: string }>> => {
  if (!dimensions || dimensions.length === 0) {
    return [];
  }

  const source = fromCommand(indices);
  const query = source
    .pipe(
      evaluate('??dim = ??dim::string', { dim: dimensions[0] }),
      where('??dim IS NOT NULL', { dim: dimensions[0] }),
      stats('BY ??dim', {
        dim: dimensions[0],
      }),
      sort('??dim', { dim: dimensions[0] }),
      limit(20)
    )
    .toString();

  try {
    const response = await esClient.esql(
      'get_dimensions',
      {
        query: query.toString(),
        filter: {
          bool: {
            filter: [...dateRangeQuery(from, to)],
          },
        },
      },
      {
        transform: 'plain',
      }
    );
    return response.hits.map((hit) => ({
      value: String(hit[dimensions[0]]),
      field: dimensions[0],
    }));
  } catch (error) {
    logger.error('Error fetching dimension values:', error);
    return [];
  }
};
