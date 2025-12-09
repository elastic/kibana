/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, combineLatest, first, map } from 'rxjs';
import type { initializeFiltersManager } from './filters_manager';

export function initializePauseFetchManager(
  filtersManager: ReturnType<typeof initializeFiltersManager>
) {
  const filtersPublished$ = new BehaviorSubject<boolean>(false);
  const filtersSubscription = filtersManager.api.filters$
    .pipe(first((filters) => Boolean(filters)))
    .subscribe(() => {
      filtersPublished$.next(true);
      filtersPublished$.complete();
    });

  const editableFetchPaused$ = new BehaviorSubject<boolean>(false);
  const setFetchPaused = (paused: boolean) => editableFetchPaused$.next(paused);

  const isFetchPaused$ = combineLatest([editableFetchPaused$, filtersPublished$]).pipe(
    map(([editableFetchPaused, filtersPublished]) => editableFetchPaused || !filtersPublished)
  );

  return {
    api: {
      isFetchPaused$,
      setFetchPaused,
    },
    cleanup: () => {
      filtersSubscription.unsubscribe();
    },
  };
}
