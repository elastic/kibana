/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Query } from '../filters';
import {
  fromKueryExpression,
  toElasticsearchQuery,
  nodeTypes,
  KueryNode,
  KueryQueryOptions,
} from '../kuery';
import { BoolQuery, DataViewBase } from './types';

/** @internal */
export function buildQueryFromKuery(
  indexPattern: DataViewBase | undefined,
  queries: Query[] = [],
  { allowLeadingWildcards = false }: { allowLeadingWildcards?: boolean } = {
    allowLeadingWildcards: false,
  },
  {
    filtersInMustClause = false,
    dateFormatTZ,
    nestedIgnoreUnmapped,
    caseInsensitive,
  }: KueryQueryOptions = {
    filtersInMustClause: false,
  }
): BoolQuery {
  const queryASTs = queries.map((query) => {
    return fromKueryExpression(query.query, { allowLeadingWildcards });
  });

  return buildQuery(indexPattern, queryASTs, {
    filtersInMustClause,
    dateFormatTZ,
    nestedIgnoreUnmapped,
    caseInsensitive,
  });
}

function buildQuery(
  indexPattern: DataViewBase | undefined,
  queryASTs: KueryNode[],
  config: KueryQueryOptions = {}
): BoolQuery {
  const compoundQueryAST = nodeTypes.function.buildNode('and', queryASTs);
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
