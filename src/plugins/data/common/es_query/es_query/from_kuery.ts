/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fromKueryExpression, toElasticsearchQuery, nodeTypes, KueryNode } from '../kuery';
import { MinimalIndexPattern } from './types';
import { Query } from '../../query/types';

export function buildQueryFromKuery(
  indexPattern: MinimalIndexPattern | undefined,
  queries: Query[] = [],
  allowLeadingWildcards: boolean = false,
  dateFormatTZ?: string
) {
  const queryASTs = queries.map((query) => {
    return fromKueryExpression(query.query, { allowLeadingWildcards });
  });

  return buildQuery(indexPattern, queryASTs, { dateFormatTZ });
}

function buildQuery(
  indexPattern: MinimalIndexPattern | undefined,
  queryASTs: KueryNode[],
  config: Record<string, any> = {}
) {
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
