/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, debounceTime, type Observable } from 'rxjs';

import { startTrackingHistory } from '@kbn/rxjs-history';

import type { DashboardState } from '../../common';

export function initializeHistoryManager({
  anyStateChange$,
  lastSavedState,
  setState,
  getState,
}: {
  anyStateChange$: Observable<void>;
  lastSavedState: DashboardState;
  getState: () => DashboardState;
  setState: (state: DashboardState) => void;
}): {
  api: ReturnType<typeof startTrackingHistory<DashboardState>>['api'];
  cleanup: () => void;
} {
  const dashboardState$ = new BehaviorSubject<DashboardState>(lastSavedState);

  const { api: historyApi, cleanup: cleanupHistoryTracking } = startTrackingHistory<DashboardState>(
    {
      state$: dashboardState$,
      maxSize: 10,
    }
  );
  const historyStateSubscription = historyApi.currentState$.subscribe((newState) => {
    setState(newState);
  });
  const onAnyStateChangeSubscription = anyStateChange$.pipe(debounceTime(0)).subscribe(() => {
    if (historyApi.isAtEnd()) dashboardState$.next(getState());
  });

  return {
    api: historyApi,
    cleanup: () => {
      historyStateSubscription.unsubscribe();
      onAnyStateChangeSubscription.unsubscribe();
      cleanupHistoryTracking();
    },
  };
}
