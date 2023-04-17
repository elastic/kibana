/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fastIsEqual from 'fast-deep-equal';
import { Observable } from 'rxjs';
import { map, distinctUntilChanged, skip, startWith } from 'rxjs/operators';
import { COMPARE_ALL_OPTIONS, onlyDisabledFiltersChanged } from '@kbn/es-query';
import type { FilterableEmbeddableInput } from './types';

export const shouldRefreshFilterCompareOptions = {
  ...COMPARE_ALL_OPTIONS,
  // do not compare $state to avoid refreshing when filter is pinned/unpinned (which does not impact results)
  state: false,
};

export function shouldFetch$<
  TFilterableEmbeddableInput extends FilterableEmbeddableInput = FilterableEmbeddableInput
>(
  updated$: Observable<unknown>,
  getInput: () => TFilterableEmbeddableInput
): Observable<TFilterableEmbeddableInput> {
  return updated$.pipe(map(() => getInput())).pipe(
    // wrapping distinctUntilChanged with startWith and skip to prime distinctUntilChanged with an initial input value.
    startWith(getInput()),
    distinctUntilChanged((a: TFilterableEmbeddableInput, b: TFilterableEmbeddableInput) => {
      if (
        !fastIsEqual(
          [a.searchSessionId, a.query, a.timeRange, a.timeslice],
          [b.searchSessionId, b.query, b.timeRange, b.timeslice]
        )
      ) {
        return false;
      }

      return onlyDisabledFiltersChanged(a.filters, b.filters, shouldRefreshFilterCompareOptions);
    }),
    skip(1)
  );
}
