/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject, filter, first } from 'rxjs';

export function initializePauseFetchManager(childFiltersLoading$: Observable<boolean>) {
  const isFetchPaused$ = new BehaviorSubject<boolean>(true);
  const setFetchPaused = (paused: boolean) => {
    isFetchPaused$.next(paused);
  };

  /**
   * Fetching stays paused until every child API is available and every child's initial filters
   * are ready (`childFiltersLoading$` covers both). Otherwise panels fetch once without control
   * filters, then again once published.
   */
  const childrenAvailableSubscription = childFiltersLoading$
    .pipe(
      filter((stillLoading) => !stillLoading),
      first()
    )
    .subscribe(() => {
      setFetchPaused(false);
    });

  return {
    api: {
      isFetchPaused$,
      setFetchPaused,
    },
    cleanup: () => {
      childrenAvailableSubscription.unsubscribe();
    },
  };
}
