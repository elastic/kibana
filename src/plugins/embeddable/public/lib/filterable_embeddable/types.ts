/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { PublishesWritableUnifiedSearch } from '@kbn/presentation-publishing';
import { EmbeddableInput } from '../embeddables';

export type FilterableEmbeddableInput = EmbeddableInput & {
  filters?: Filter[];
  query?: Query;
  searchSessionId?: string;
  timeRange?: TimeRange;
  timeslice?: [number, number];
};

export type EmbeddableHasTimeRange = Pick<
  PublishesWritableUnifiedSearch,
  'timeRange$' | 'setTimeRange' | 'isCompatibleWithUnifiedSearch'
>;

/**
 * All embeddables that implement this interface should support being filtered
 * and/or queried via the top navigation bar.
 */
export interface FilterableEmbeddable {
  /**
   * Gets the embeddable's local filters
   **/
  getFilters: () => Filter[];
  /**
   * Gets the embeddable's local query
   **/
  getQuery: () => Query | AggregateQuery | undefined;
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
