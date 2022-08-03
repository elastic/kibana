/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggregateQuery, Filter, Query } from '@kbn/es-query';

export interface FilterableEmbeddable {
  getFilters: () => Filter[];
  getQuery: () => Query | AggregateQuery | undefined;
}

export function isFilterableEmbeddable(incoming: unknown): incoming is FilterableEmbeddable {
  return !!(incoming as FilterableEmbeddable).getFilters;
}
