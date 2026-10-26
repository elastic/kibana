/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, filter, first } from 'rxjs';
import type { initializeFiltersManager } from './filters_manager';

export function initializePauseFetchManager(
  filtersManager: ReturnType<typeof initializeFiltersManager>
) {
  const isFetchPaused$ = new BehaviorSubject<boolean>(true);
  const setFetchPaused = (paused: boolean) => isFetchPaused$.next(paused);

  const initialFiltersSubscription = filtersManager.api.childFiltersLoading$
    .pipe(
      filter((loading) => !loading),
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
      initialFiltersSubscription.unsubscribe();
    },
  };
}
