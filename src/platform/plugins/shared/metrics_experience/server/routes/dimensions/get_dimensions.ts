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

  // Build query using the esql composer with .pipe() method

  // query.pipe`WHERE ??dim IS NOT NULL`;

  // Add WHERE command from Discover query if present
  // Use string pipe syntax to avoid type issues with AST nodes
  // if (originalQuery) {
  //   const whereCommand = extractWhereCommand(originalQuery);
  //   if (whereCommand) {
  //     query.pipe(BasicPrettyPrinter.print(whereCommand));
  //   }
  // }

  // New: Build query using the platform @kbn/esql-ast
  const dim = dimensions[0];
  const query = esql.from(indices).pipe`EVAL ??dim = ??dim::string`.sort(`??dim`).limit(20);
  // I set it as param so we can use the ??dim template literal in the query
  query.setParam('dim', dim);
  
  const whereCommandDiscover = originalQuery ? extractWhereCommand(originalQuery) : undefined;
  if (whereCommandDiscover) {
    const whereCommandString = BasicPrettyPrinter.print(whereCommandDiscover);
    // Remove the "WHERE " prefix from the whereCommandString
    query.setParam('whereCommand', whereCommandString.substring(6));
    query.pipe`WHERE ${esql.exp`??whereCommand`} AND ??dim IS NOT NULL`;
  } else {
    query.pipe`WHERE ??dim IS NOT NULL`;
  }
  query.pipe`STATS BY ??dim`;

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
