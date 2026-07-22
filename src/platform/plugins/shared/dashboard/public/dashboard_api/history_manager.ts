/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import { startTrackingHistory } from '@kbn/rxjs-history';

import type { DashboardState } from '../../common';
import type { initializeDataLoadingManager } from './data_loading_manager';
import type { initializeTrackOverlay } from './track_overlay';
import type { initializeUnsavedChangesManager } from './unsaved_changes_manager';

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
  const dashboardCurrentState$ = new BehaviorSubject<DashboardState>(getState());
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
  const onAnyStateChangeSubscription = unsavedChanges$
    // .pipe(
    //   filter(([anyStateChange, dataLoading]) => {
    //     console.log({ dataLoading });
    //     return !Boolean(dataLoading); // wait until done loading before updating history
    //   })
    // )
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
