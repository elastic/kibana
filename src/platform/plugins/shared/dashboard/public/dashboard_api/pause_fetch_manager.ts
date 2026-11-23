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

export function initializePauseFetchManager(childrenLoading$: Observable<boolean>) {
  const isFetchPaused$ = new BehaviorSubject<boolean>(true);
  const setFetchPaused = (paused: boolean) => {
    isFetchPaused$.next(paused);
  };

  /**
   * Fetching stays paused until every child API is available
   */
  const childrenAvailableSubscription = childrenLoading$
    .pipe(
      filter((childrenLoading) => !childrenLoading),
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
