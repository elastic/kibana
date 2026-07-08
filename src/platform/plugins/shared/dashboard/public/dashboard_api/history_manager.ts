/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BehaviorSubject,
  debounceTime,
  finalize,
  first,
  firstValueFrom,
  skipWhile,
  switchMap,
  type Observable,
} from 'rxjs';

import { startTrackingHistory } from '@kbn/rxjs-history';

import type { DashboardState } from '../../common';
import type { initializeDataLoadingManager } from './data_loading_manager';

export function initializeHistoryManager({
  anyStateChange$,
  lastSavedState,
  setState,
  getState,
  dataLoadingManager: {
    api: { dataLoading$ },
  },
}: {
  anyStateChange$: Observable<void>;
  lastSavedState: DashboardState;
  getState: () => DashboardState;
  setState: (state: DashboardState) => void;
  dataLoadingManager: ReturnType<typeof initializeDataLoadingManager>;
}): {
  api: ReturnType<typeof startTrackingHistory<DashboardState>>['api'];
  cleanup: () => void;
} {
  const dashboardState$ = new BehaviorSubject<DashboardState>(lastSavedState);
  const { api: historyApi, cleanup: cleanupHistoryTracking } = startTrackingHistory<DashboardState>(
    {
      state$: dashboardState$,
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

  // when state changes, update full dashboard state so that we can store it in the history
  const onAnyStateChangeSubscription = anyStateChange$
    .pipe(
      debounceTime(300), // wait until state updates stabilize before updating history
      switchMap(async () => {
        // wait for panels to load before updating history
        const waitForPanelsToLoad$ = dataLoading$.pipe(
          skipWhile((isLoading: boolean | undefined) => Boolean(isLoading))
        );
        console.log('BEFORE');
        const result = await firstValueFrom(waitForPanelsToLoad$);
        console.log({ result });
      })
    )
    .subscribe(() => {
      console.log('anyStateChange$');
      dashboardState$.next(getState());
    });

  // when the history's current state updates, respond by setting state on the Dashboard
  const historyStateSubscription = historyApi.currentState$.subscribe((newState) => {
    console.log('currentState$', { newState });
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
