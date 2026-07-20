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
import type { initializeDataLoadingManager } from './data_loading_manager';
import type { initializeTrackOverlay } from './track_overlay';

export function initializeHistoryManager({
  anyStateChange$,
  hasOverlays$,
  initialState,
  setState,
  getState,
  dataLoadingManager: {
    api: { dataLoading$ },
  },
}: {
  anyStateChange$: Observable<void>;
  hasOverlays$: ReturnType<typeof initializeTrackOverlay>['hasOverlays$'];
  initialState: DashboardState;
  getState: () => DashboardState;
  setState: (state: DashboardState) => void;
  dataLoadingManager: ReturnType<typeof initializeDataLoadingManager>;
}): {
  api: ReturnType<typeof startTrackingHistory<DashboardState>>['api'];
  cleanup: () => void;
} {
  const dashboardCurrentState$ = new BehaviorSubject<DashboardState>(initialState);
  const { api: historyApi, cleanup: cleanupHistoryTracking } = startTrackingHistory<DashboardState>(
    {
      disableUndoRedo$: hasOverlays$,
      state$: dashboardCurrentState$,
      mapState: (state) => {
        const sortById = (
          { id: idA }: DashboardState['panels'][number] | DashboardState['pinned_panels'][number],
          { id: idB }: DashboardState['panels'][number] | DashboardState['pinned_panels'][number]
        ) => (idA ?? '').localeCompare(idB ?? '');
        return {
          ...state,
          panels: state.panels.sort(sortById),
          // pinned_panels: state.pinned_panels.sort(sortById),
        };
      },
      maxSize: 10,
    }
  );

  // when the Dashboard state changes, add the new state to the history stack
  const onAnyStateChangeSubscription = anyStateChange$
    .pipe(
      debounceTime(500) // wait until state updates stabilize before updating history
    )
    .subscribe(() => {
      dashboardCurrentState$.next(getState());
    });

  // when the history's state updates, respond by setting state on the Dashboard
  const historyStateSubscription = historyApi.currentState$.subscribe((newState) => {
    setState(newState);
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
