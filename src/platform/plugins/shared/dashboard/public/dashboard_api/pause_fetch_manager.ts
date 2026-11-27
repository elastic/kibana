/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';

/**
 * Fetching is paused while the initial publish of the children's filters is pending: on load, and again each
 * time the grid opens. A pause set through `setFetchPaused` after the first unpause is left alone.
 */
export function initializePauseFetchManager(initialPublishPending$: Observable<boolean>) {
  const isFetchPaused$ = new BehaviorSubject<boolean>(true);
  const setFetchPaused = (paused: boolean) => isFetchPaused$.next(paused);

  let pausedForInitialPublish = true;
  const initialPublishSubscription = initialPublishPending$
    .pipe(distinctUntilChanged())
    .subscribe((pending) => {
      if (pending && !isFetchPaused$.getValue()) {
        pausedForInitialPublish = true;
        setFetchPaused(true);
      } else if (!pending && pausedForInitialPublish) {
        pausedForInitialPublish = false;
        setFetchPaused(false);
      }
    });

  return {
    api: {
      isFetchPaused$,
      setFetchPaused,
    },
    cleanup: () => {
      initialPublishSubscription.unsubscribe();
    },
  };
}
