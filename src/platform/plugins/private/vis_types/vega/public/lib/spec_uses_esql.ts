/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery } from '@kbn/es-query';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import { getEsqlQueriesFromSpec } from '@kbn/vega-utils';
import type { VegaSpec } from '../data_model/types';

/**
 * Derived ES|QL query for related-panel highlighting. Multi-source specs publish a synthetic
 * query whose variable names are the union of those used in each source.
 */
export function getPublishedEsqlQuery(spec: VegaSpec | undefined): AggregateQuery | undefined {
  if (!spec) {
    return undefined;
  }

  const queries = getEsqlQueriesFromSpec(spec);
  if (queries.length === 0) {
    return undefined;
  }
  if (queries.length === 1) {
    return { esql: queries[0] };
  }

  const names = [...new Set(queries.flatMap((query) => getESQLQueryVariables(query)))];
  const where = names.map((name) => `?${name} == ?${name}`).join(' AND ');
  return { esql: where ? `FROM index | WHERE ${where}` : 'FROM index' };
}
