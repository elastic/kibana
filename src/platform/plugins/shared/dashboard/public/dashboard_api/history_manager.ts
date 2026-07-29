/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, combineLatest, debounceTime, filter, map, withLatestFrom } from 'rxjs';

import { startTrackingHistory } from '@kbn/rxjs-history';

import type { DashboardState } from '../../common';
import type { initializeDataLoadingManager } from './data_loading_manager';
import type { initializeTrackOverlay } from './track_overlay';
import type { initializeUnsavedChangesManager } from './unsaved_changes_manager';
import { cloneDeep } from 'lodash';

export function initializeHistoryManager({
  unsavedChanges$,
  hasOverlays$,
  setState,
  getState,
  dataLoadingManager: {
    api: { dataLoading$ },
  },
}: {
  unsavedChanges$: ReturnType<
    typeof initializeUnsavedChangesManager
  >['internalApi']['unsavedChanges$'];
  hasOverlays$: ReturnType<typeof initializeTrackOverlay>['hasOverlays$'];
  getState: () => DashboardState;
  setState: (state: DashboardState) => void;
  dataLoadingManager: ReturnType<typeof initializeDataLoadingManager>;
}): {
  api: ReturnType<typeof startTrackingHistory<DashboardState>>['api'];
  cleanup: () => void;
} {
  const disableUndoRedo$ = new BehaviorSubject<boolean>(false);
  const dashboardCurrentState$ = new BehaviorSubject<DashboardState>(getState());

  combineLatest([hasOverlays$, dataLoading$.pipe(debounceTime(60))])
    .pipe(map(([hasOverlays, dataLoading]) => Boolean(hasOverlays || dataLoading)))
    .subscribe((disableUndoRedo) => {
      disableUndoRedo$.next(disableUndoRedo);
    });

  const { api: historyApi, cleanup: cleanupHistoryTracking } = startTrackingHistory<DashboardState>(
    {
      disableUndoRedo$,
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

  const onAnyStateChangeSubscription = combineLatest([unsavedChanges$, dataLoading$])
    .pipe(
      debounceTime(60),
      withLatestFrom(hasOverlays$),
      filter(([[state, loading], hasOverlays]) => {
        console.log({ state, loading, hasOverlays });
        // do not push to history as long as...
        return (
          !loading && // at least one child is loading or
          !hasOverlays // an editor is open
        );
      })
    )
    .subscribe(([[state]]) => {
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
