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
  merge,
  type Observable,
} from 'rxjs';

import type {
  HasLastSavedChildState,
  PublishesSavedObjectId,
  PublishingSubject,
  ViewMode,
} from '@kbn/presentation-publishing';

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { getDashboardBackupService } from '../services/dashboard_api_services';
import { type DashboardBackupState } from '../services/dashboard_backup_service';
import type { ChangeSourceTracker } from './change_source_tracker';
import { diffDashboardStates } from './compare_dashboard_state';
import type { initializeLayoutManager } from './layout_manager';
import type { PublishesOnSave } from './types';

const DEBOUNCE_TIME = 100;

export function initializeUnsavedChangesManager({
  layoutManager,
  savedObjectId$,
  lastSavedState,
  getState,
  anyStateChange$,
  hasProjectRouting,
  viewMode$,
  storeUnsavedChanges,
  setState,
  onSave$,
  changeSourceTracker,
}: {
  lastSavedState: DashboardState;
  storeUnsavedChanges?: boolean;
  savedObjectId$: PublishesSavedObjectId['savedObjectId$'];
  layoutManager: ReturnType<typeof initializeLayoutManager>;
  viewMode$: PublishingSubject<ViewMode>;
  getState: () => DashboardState;
  anyStateChange$: Observable<unknown>;
  hasProjectRouting: boolean;
  setState: (state: DashboardState) => Promise<void>;
  onSave$: PublishesOnSave['onSave$'];
  changeSourceTracker: ChangeSourceTracker;
}): {
  api: {
    hasUnsavedChanges$: PublishingSubject<boolean>;
    asyncResetToLastSavedState: () => Promise<void>;
  } & HasLastSavedChildState;
  cleanup: () => void;
  internalApi: {
    getLastSavedState: () => DashboardState;
    unsavedChanges$: Observable<Partial<DashboardState>>;
  };
} {
  const hasUnsavedChanges$ = new BehaviorSubject(false);
  const lastSavedState$ = new BehaviorSubject<DashboardState>(lastSavedState);
  // subscribed first, so the layout knows the last saved panels before children read them
  const lastSavedLayoutSubscription = lastSavedState$.subscribe((state) =>
    layoutManager.internalApi.setLastSavedState(state)
  );
  const onSaveSubscription = onSave$.subscribe(({ dashboardState }) => {
    lastSavedState$.next(dashboardState);
  });

  const getCurrentState = (): DashboardState => {
    const state = getState();
    if (hasProjectRouting) return state;
    // without cross-project search the project routing cannot change, so keep the saved one
    const { project_routing: savedProjectRouting } = lastSavedState$.value;
    return savedProjectRouting ? { ...state, project_routing: savedProjectRouting } : state;
  };

  const dashboardStateChanges$ = merge(
    anyStateChange$,
    // re-compare once a panel loads, so it is compared with its own comparators
    layoutManager.api.children$,
    // re-compare once a panel type's comparer loads, for panels that have not loaded
    layoutManager.internalApi.panelTypeComparers$,
    lastSavedState$
  ).pipe(
    debounceTime(DEBOUNCE_TIME),
    map(() =>
      diffDashboardStates(
        lastSavedState$.value,
        getCurrentState(),
        layoutManager.api.children$.getValue(),
        layoutManager.internalApi.panelTypeComparers$.getValue()
      )
    )
  );

  const unsavedChangesSubscription = combineLatest([viewMode$, dashboardStateChanges$])
    .pipe(
      debounceTime(DEBOUNCE_TIME),
      filter(([viewMode]) => viewMode !== 'non-interactive') // don't track unsaved changes in non-interactive mode
    )
    .subscribe(([viewMode, dashboardChanges]) => {
      const hasUnsavedChanges = Object.keys(dashboardChanges ?? {}).length > 0;

      if (hasUnsavedChanges !== hasUnsavedChanges$.value) {
        hasUnsavedChanges$.next(hasUnsavedChanges);
      }

      if (storeUnsavedChanges) {
        const { time_restore, ...restOfDashboardChanges } = dashboardChanges;
        const hasEditsToBackUp = Object.keys(restOfDashboardChanges).length > 0;
        const changedByToBackUp = changeSourceTracker.getUnsavedSources();
        const dashboardBackupState: DashboardBackupState = {
          // always back up view mode. This allows us to know which Dashboards were last changed while in edit mode.
          viewMode,
          ...restOfDashboardChanges,
          ...(hasEditsToBackUp && changedByToBackUp.length > 0 && { changedBy: changedByToBackUp }),
        };
        getDashboardBackupService().setState(savedObjectId$.value, dashboardBackupState);
      }
    });

  const getLastSavedStateForChild = (childId: string) =>
    layoutManager.internalApi.getLastSavedStateForPanel(childId);

  return {
    api: {
      asyncResetToLastSavedState: async () => {
        changeSourceTracker.resetToSaved();
        await setState(lastSavedState$.value);
      },
      hasUnsavedChanges$,
      lastSavedStateForChild$: (panelId: string) =>
        lastSavedState$.pipe(map(() => getLastSavedStateForChild(panelId))),
      getLastSavedStateForChild,
    },
    cleanup: () => {
      unsavedChangesSubscription.unsubscribe();
      onSaveSubscription.unsubscribe();
      lastSavedLayoutSubscription.unsubscribe();
    },
    internalApi: {
      getLastSavedState: () => lastSavedState$.value,
      unsavedChanges$: dashboardStateChanges$,
    },
  };
}
