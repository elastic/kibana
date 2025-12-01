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
import {
  from as fromCommand,
  evaluate,
  where,
  stats,
  sort,
  limit,
  append,
} from '@kbn/esql-composer';
import { esql, BasicPrettyPrinter } from '@kbn/esql-ast';
import { extractWhereCommand } from '../../lib/utils';

interface CreateDimensionsParams {
  esClient: TracedElasticsearchClient;
  dimensions: string[];
  indices: string[];
  from: number;
  to: number;
  query?: string;
  logger: Logger;
}

export const getDimensions = async ({
  esClient,
  dimensions,
  indices,
  from,
  to,
  logger,
  query: originalQuery,
}: CreateDimensionsParams): Promise<Array<{ value: string; field: string }>> => {
  if (!dimensions || dimensions.length === 0) {
    return [];
  }

  // New: Build query using the platform @kbn/esql-ast
  const dim = dimensions[0];
  const whereCommandDiscover = originalQuery ? extractWhereCommand(originalQuery) : undefined;
  
  const query = esql.from(indices).pipe`EVAL ??dim = ??dim::string`.pipe`WHERE ??dim IS NOT NULL`
  
  if (whereCommandDiscover) {;
    query.pipe(BasicPrettyPrinter.print(whereCommandDiscover));
  }
  query.pipe`STATS BY ??dim`.sort(`??dim`,).limit(20).setParam('dim', dim);
  console.log('query new',query.inlineParams().print('wrapping'));
  
  // Old: Build query using the esql composer
  const whereCommand = originalQuery ? extractWhereCommand(originalQuery) : undefined;

  const source = fromCommand(indices);
  const queryOld = source
    .pipe(
      evaluate('??dim = ??dim::string', { dim: dimensions[0] }),
      where('??dim IS NOT NULL', { dim: dimensions[0] }),
      whereCommand ? append({ command: BasicPrettyPrinter.print(whereCommand) }) : (q) => q,
      stats('BY ??dim', {
        dim: dimensions[0],
      }),
      sort('??dim', { dim: dimensions[0] }),
      limit(20)
    )
    .toString();

  console.log('queryOld',queryOld);
  try {
    const response = await esClient.esql(
      'get_dimensions',
      {
        query: query.inlineParams().print('wrapping'),
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
