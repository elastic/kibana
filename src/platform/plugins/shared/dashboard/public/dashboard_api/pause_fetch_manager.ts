/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, combineLatest, filter, first } from 'rxjs';
import type { initializeFiltersManager } from './filters_manager';

export function initializePauseFetchManager(
  filtersManager: ReturnType<typeof initializeFiltersManager>
) {
  const isFetchPaused$ = new BehaviorSubject<boolean>(true);
  const setFetchPaused = (paused: boolean) => {
    console.log('setFetchPaused ', { paused });
    isFetchPaused$.next(paused);
  };

  /**
   * Unpause once child filters have loaded. Also unpause while awaiting required filters: the grid is not
   * rendered then, so only pinned controls are mounted, and they must be able to fetch their options for the
   * user to supply the required value (the dashboard's pause applies to its controls, too).
   */
  const initialFiltersSubscription = combineLatest([
    filtersManager.api.childFiltersLoading$,
    filtersManager.api.awaitingRequiredFilters$,
  ])
    .pipe(
      filter(([loading, awaitingRequired]) => !loading || awaitingRequired === true),
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
