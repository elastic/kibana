/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type AggregateQuery, type Filter, type Query } from '@kbn/es-query';

/**
 * All embeddables that implement this interface should support being filtered
 * and/or queried via the top navigation bar
 * @public
 */
export interface FilterableEmbeddable {
  /**
   * Gets the embeddable's local filters
   **/
  getFilters: () => Promise<Filter[]>;
  /**
   * Gets the embeddable's local query
   **/
  getQuery: () => Promise<Query | AggregateQuery | undefined>;
}

/**
 * Ensure that embeddable supports filtering/querying
 * @param incoming Embeddable that is being tested to check if it is a FilterableEmbeddable
 * @returns true if the incoming embeddable is a FilterableEmbeddable, false if it is not
 */
export function isFilterableEmbeddable(incoming: unknown): incoming is FilterableEmbeddable {
  return (
    !!(incoming as FilterableEmbeddable).getFilters && !!(incoming as FilterableEmbeddable).getQuery
  );
}
