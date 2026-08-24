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
  combineLatest,
  debounceTime,
  filter,
  map,
  switchMap,
  withLatestFrom,
  type Observable,
  type Subject,
} from 'rxjs';

import { startTrackingHistory } from '@kbn/rxjs-history';

import type { DashboardState } from '../../common';
import type { initializeLayoutManager } from './layout_manager';
import type { initializeTrackOverlay } from './track_overlay';

export function initializeHistoryManager({
  anyStateChange$,
  hasOverlays$,
  setState,
  getState,
  dataLoading$,
  historyUpdated$,
}: {
  anyStateChange$: ReturnType<typeof initializeLayoutManager>['internalApi']['anyStateChange$'];
  hasOverlays$: ReturnType<typeof initializeTrackOverlay>['hasOverlays$'];
  getState: () => DashboardState;
  setState: (state: DashboardState) => Promise<void>;
  dataLoading$: Observable<boolean>;
  historyUpdated$: Subject<void>;
}): {
  api: ReturnType<typeof startTrackingHistory<DashboardState>>['api'];
  cleanup: () => void;
} {
  const disableUndoRedo$ = new BehaviorSubject<boolean>(false);
  const dashboardCurrentState$ = new BehaviorSubject<DashboardState | undefined>(undefined);

  combineLatest([hasOverlays$, dataLoading$])
    .pipe(map(([hasOverlays, dataLoading]) => Boolean(hasOverlays || dataLoading)))
    .subscribe((disableUndoRedo) => {
      disableUndoRedo$.next(disableUndoRedo);
    });

  const { api: historyApi, cleanup: cleanupHistoryTracking } = startTrackingHistory<DashboardState>(
    {
      disableUndoRedo$,
      state$: dashboardCurrentState$,
      mapState: (state) => {
        return {
          ...state,
          panels: state.panels.sort(sortById), // keep panel order consistent so that diffing on array works as expected
        };
      },
      maxSize: 10,
    }
  );

  const onAnyStateChangeSubscription = combineLatest([anyStateChange$, dataLoading$])
    .pipe(
      debounceTime(0), // flatten anyStateChange + dataLoading event updates
      withLatestFrom(hasOverlays$),
      // do not push to history while a child is loading or an editor is open
      filter(([[, loading], hasOverlays]) => !loading && !hasOverlays)
    )
    .subscribe(([[, loading]]) => {
      dashboardCurrentState$.next(getState());
      historyUpdated$.next();
    });

  // when the history's state updates, respond by setting state on the Dashboard
  const historyStateSubscription = historyApi.currentState$
    .pipe(
      switchMap(async (newState) => {
        if (!newState) return;
        await setState(newState);
      })
    )
    .subscribe();

  return {
    api: historyApi,
    cleanup: () => {
      historyStateSubscription.unsubscribe();
      onAnyStateChangeSubscription.unsubscribe();
      cleanupHistoryTracking();
    },
  };
}

const sortById = (
  { id: idA }: DashboardState['panels'][number] | DashboardState['pinned_panels'][number],
  { id: idB }: DashboardState['panels'][number] | DashboardState['pinned_panels'][number]
) => (idA ?? '').localeCompare(idB ?? '');
