/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { Query } from '../filters';
import type { BoolQuery, DataViewBase } from './types';
import { fromKueryExpression, toElasticsearchQuery, functions } from '../kuery';
import { KqlFunctionNode } from '../kuery/node_types/function';

/** @internal */
export function buildQueryFromKuery(
  indexPattern: DataViewBase | undefined,
  queries: Query[] = [],
  allowLeadingWildcards: boolean = false,
  dateFormatTZ?: string,
  filtersInMustClause: boolean = false
): BoolQuery {
  const queryASTs = queries.map((query) => {
    if (typeof query.query !== 'string') {
      throw new Error(`Cannot parse KQL expression: ${query.query}`);
    }
    return fromKueryExpression<KqlFunctionNode>(query.query, { allowLeadingWildcards });
  });

  return buildQuery(indexPattern, queryASTs, { dateFormatTZ, filtersInMustClause });
}

function buildQuery(
  indexPattern: DataViewBase | undefined,
  queryASTs: KqlFunctionNode[],
  config: SerializableRecord = {}
): BoolQuery {
  const compoundQueryAST = functions.and.buildNode(queryASTs);
  const kueryQuery = toElasticsearchQuery(compoundQueryAST, indexPattern, config);

  return Object.assign(
    {
      must: [],
      filter: [],
      should: [],
      must_not: [],
    },
    kueryQuery.bool
  );
}
