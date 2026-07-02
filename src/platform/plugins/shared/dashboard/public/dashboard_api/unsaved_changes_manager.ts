/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, combineLatest, debounceTime, map, merge, type Observable } from 'rxjs';

import { startTrackingHistory } from '@kbn/rxjs-history';
import type { HasLastSavedChildState } from '@kbn/presentation-publishing';
import type {
  PublishesSavedObjectId,
  PublishingSubject,
  ViewMode,
} from '@kbn/presentation-publishing';

import { of } from 'rxjs';
import type { DashboardState } from '../../common';
import { type DashboardBackupState } from '../services/dashboard_backup_service';
import { getDashboardBackupService } from '../services/dashboard_api_services';
import type { initializeLayoutManager } from './layout_manager';
import type { initializeProjectRoutingManager } from './project_routing_manager';
import type { initializeApproximationManager } from './approximation_manager';
import type { initializeSettingsManager } from './settings_manager';
import type { initializeUnifiedSearchManager } from './unified_search_manager';
import type { PublishesOnSave } from './types';

const DEBOUNCE_TIME = 100;

export function initializeUnsavedChangesManager({
  layoutManager,
  savedObjectId$,
  lastSavedState,
  settingsManager,
  viewMode$,
  storeUnsavedChanges,
  unifiedSearchManager,
  projectRoutingManager,
  approximationManager,
  setState,
  getState,
  onSave$,
}: {
  lastSavedState: DashboardState;
  storeUnsavedChanges?: boolean;
  savedObjectId$: PublishesSavedObjectId['savedObjectId$'];
  layoutManager: ReturnType<typeof initializeLayoutManager>;
  viewMode$: PublishingSubject<ViewMode>;
  settingsManager: ReturnType<typeof initializeSettingsManager>;
  unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>;
  projectRoutingManager?: ReturnType<typeof initializeProjectRoutingManager>;
  approximationManager: ReturnType<typeof initializeApproximationManager>;
  getState: () => DashboardState;
  setState: (state: DashboardState) => void;
  onSave$: PublishesOnSave['onSave$'];
}): {
  api: {
    hasUnsavedChanges$: PublishingSubject<boolean>;
    asyncResetToLastSavedState: () => Promise<void>;
    anyStateChange$: Observable<void>;
  } & HasLastSavedChildState;
  cleanup: () => void;
  internalApi: {
    getLastSavedState: () => DashboardState;
  };
} {
  // const dashboardHistory = createTravels(lastSavedState);
  const dashboardState$ = new BehaviorSubject<DashboardState>(lastSavedState);
  const { api: historyApi, cleanup: cleanupHistoryTracking } = startTrackingHistory<DashboardState>(
    {
      state$: dashboardState$,
      maxSize: 10,
    }
  );
  const dashboardStateWithHistory$ = historyApi.currentState$;
  const hasUnsavedChanges$ = new BehaviorSubject(false);
  const lastSavedState$ = new BehaviorSubject<DashboardState>(lastSavedState);
  const onSaveSubscription = onSave$.subscribe(({ dashboardState }) => {
    lastSavedState$.next(dashboardState);
  });

  const anyStateChange$ = merge(
    settingsManager.internalApi.anyStateChange$,
    unifiedSearchManager.internalApi.anyStateChange$,
    layoutManager.internalApi.anyStateChange$,
    projectRoutingManager?.internalApi.anyStateChange$ ?? of()
  );

  // const test = anyStateChange$.pipe(debounceTime(1)).subscribe(() => {
  //   console.log('any state change', historyApi.isAtEnd());
  //   if (historyApi.isAtEnd()) dashboardState$.next(getState());
  // });

  const dashboardStateChanges$ = combineLatest([
    settingsManager.internalApi.startComparing(lastSavedState$),
    unifiedSearchManager.internalApi.startComparing(lastSavedState$),
    layoutManager.internalApi.startComparing(lastSavedState$),
    projectRoutingManager?.internalApi.startComparing(lastSavedState$) ?? of({}),
    approximationManager.internalApi.startComparing(lastSavedState$),
  ]).pipe(
    map(([settings, unifiedSearch, layout, projectRouting, approximation]) => {
      return { ...settings, ...unifiedSearch, ...layout, ...projectRouting, ...approximation };
    })
  );

  const unsavedChangesSubscription = combineLatest([viewMode$, dashboardStateChanges$])
    .pipe(debounceTime(DEBOUNCE_TIME))
    .subscribe(([viewMode, dashboardChanges]) => {
      if (historyApi.isAtEnd()) dashboardState$.next(getState());

      const hasUnsavedChanges = Object.keys(dashboardChanges ?? {}).length > 0;
      if (hasUnsavedChanges !== hasUnsavedChanges$.value) {
        hasUnsavedChanges$.next(hasUnsavedChanges);
      }
      if (storeUnsavedChanges) {
        const { time_restore, ...restOfDashboardChanges } = dashboardChanges;
        const dashboardBackupState: DashboardBackupState = {
          // always back up view mode. This allows us to know which Dashboards were last changed while in edit mode.
          viewMode,
          ...restOfDashboardChanges,
        };
        getDashboardBackupService().setState(savedObjectId$.value, dashboardBackupState);
      }
    });

  const getLastSavedStateForChild = (childId: string) =>
    layoutManager.internalApi.getLastSavedStateForPanel(childId);

  dashboardStateWithHistory$.subscribe((newState) => {
    console.log('SET STATE', newState);
    setState(newState);
  });

  return {
    api: {
      anyStateChange$,
      asyncResetToLastSavedState: async () => {
        setState(lastSavedState$.value);
      },
      hasUnsavedChanges$,
      lastSavedStateForChild$: (panelId: string) =>
        lastSavedState$.pipe(map(() => getLastSavedStateForChild(panelId))),
      getLastSavedStateForChild,
    },
    cleanup: () => {
      cleanupHistoryTracking();
      unsavedChangesSubscription.unsubscribe();
      onSaveSubscription.unsubscribe();
    },
    internalApi: {
      getLastSavedState: () => lastSavedState$.value,
      ...historyApi,
    },
  };
}
