/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fastIsEqual from 'fast-deep-equal';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { COMPARE_ALL_OPTIONS, onlyDisabledFiltersChanged } from '@kbn/es-query';

export const shouldRefreshFilterCompareOptions = {
  ...COMPARE_ALL_OPTIONS,
  // do not compare $state to avoid refreshing when filter is pinned/unpinned (which does not impact results)
  state: false,
};

type FilterableEmbeddableInput = EmbeddableInput & {
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  timeslice?: [number, number];
  [key: string]: unknown;
};

export function shouldFetch$(
  updated$: Observable<unknown>,
  getInput: () => FilterableEmbeddableInput
) {
  return updated$.pipe(map(() => getInput())).pipe(
    distinctUntilChanged((a, b) => {
      if (
        !fastIsEqual(
          [a.searchSessionId, a.query, a.timeRange, a.timeslice],
          [b.searchSessionId, b.query, b.timeRange, b.timeslice]
        )
      ) {
        return false;
      }

      return onlyDisabledFiltersChanged(a.filters, b.filters, shouldRefreshFilterCompareOptions);
    })
  );
}
