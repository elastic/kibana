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
  tap,
  withLatestFrom,
  type Observable,
  type Subject,
} from 'rxjs';

import { startTrackingHistory } from '@kbn/rxjs-history';

import type { DashboardState } from '../../common';
import type { initializeTrackOverlay } from './track_overlay';

export function initializeHistoryManager({
  anyStateChange$,
  hasOverlays$,
  setState,
  getState,
  dataLoading$,
  historyUpdated$,
}: {
  anyStateChange$: Observable<void>;
  hasOverlays$: ReturnType<typeof initializeTrackOverlay>['hasOverlays$'];
  getState: () => DashboardState;
  setState: (state: DashboardState) => Promise<void>;
  dataLoading$: Observable<boolean>;
  historyUpdated$: Subject<void>;
}) {
  const disableUndoRedo$ = new BehaviorSubject<boolean>(false);

  const disableUndoRedoSubscription = combineLatest([hasOverlays$, dataLoading$])
    .pipe(map(([hasOverlays, dataLoading]) => Boolean(hasOverlays || dataLoading)))
    .subscribe((disableUndoRedo) => {
      disableUndoRedo$.next(disableUndoRedo);
    });

  const { api: historyApi, cleanup: cleanupHistoryTracking } = startTrackingHistory<DashboardState>(
    {
      onStateChange$: combineLatest([anyStateChange$, dataLoading$]).pipe(
        debounceTime(0), // flatten anyStateChange + dataLoading event updates
        withLatestFrom(hasOverlays$),
        // do not push to history while a child is loading or an editor is open
        filter(([[, loading], hasOverlays]) => !loading && !hasOverlays),
        map(() => {
          const state = getState();
          return {
            ...state,
            panels: state.panels.sort(sortById), // keep panel order consistent so that diffing on array works as expected
          };
        }),
        tap(() => {
          historyUpdated$.next();
        })
      ),
      setState: async (state: DashboardState) => {
        await setState(state);
        historyUpdated$.next();
      },
      getLatestState: getState,
      maxSize: 100,
    }
  );

  return {
    internalApi: {
      ...historyApi,
      disableUndoRedo$,
    },
    cleanup: () => {
      disableUndoRedoSubscription.unsubscribe();
      cleanupHistoryTracking();
    },
  };
}

const sortById = (
  { id: idA }: DashboardState['panels'][number] | DashboardState['pinned_panels'][number],
  { id: idB }: DashboardState['panels'][number] | DashboardState['pinned_panels'][number]
) => (idA ?? '').localeCompare(idB ?? '');
