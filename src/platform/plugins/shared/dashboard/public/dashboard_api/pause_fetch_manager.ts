/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, filter, first, merge, skip, take } from 'rxjs';
import type { initializeFiltersManager } from './filters_manager';

export function initializePauseFetchManager(
  filtersManager: ReturnType<typeof initializeFiltersManager>
) {
  const isFetchPaused$ = new BehaviorSubject<boolean>(true);
  const setFetchPaused = (paused: boolean) => isFetchPaused$.next(paused);

  // Don't unpause as soon as loading is done: the control filters show up a tick later,
  // and we'd mistake them for a search change and start a new session.
  const initialFiltersSubscription = merge(
    // child filters are only pushed once loading finishes. If nothing is loading at start
    // (e.g. no controls), they're never pushed, so unpause right away instead
    filtersManager.api.childFiltersLoading$.pipe(
      take(1),
      filter((loading) => !loading)
    ),
    // child filters are pushed here a tick after they finish loading
    filtersManager.api.unpublishedChildFilters$.pipe(skip(1))
  )
    .pipe(first())
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
