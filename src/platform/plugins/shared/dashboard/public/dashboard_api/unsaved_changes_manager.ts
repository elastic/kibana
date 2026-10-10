/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, combineLatest, debounceTime, map, of, type Observable } from 'rxjs';

import type {
  HasLastSavedChildState,
  PublishesSavedObjectId,
  PublishingSubject,
  ViewMode,
} from '@kbn/presentation-publishing';

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { getDashboardBackupService } from '../services/dashboard_api_services';
import { type DashboardBackupState } from '../services/dashboard_backup_service';
import type { initializeApproximationManager } from './approximation_manager';
import type { ChangeSourceTracker, LatestChangeBySource } from './change_source_tracker';
import type { initializeLayoutManager } from './layout_manager';
import type { initializeProjectRoutingManager } from './project_routing_manager';
import type { initializeSettingsManager } from './settings_manager';
import { reportDashboardSaved } from './telemetry/report_dashboard_saved';
import type { DashboardSaveEvent } from './types';
import type { initializeUnifiedSearchManager } from './unified_search_manager';

const DEBOUNCE_TIME = 100;

export type DashboardSaveWithChangeSources = DashboardSaveEvent & {
  latestChangeBySource: LatestChangeBySource;
};

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
  onSave$,
  changeSourceTracker,
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
  setState: (state: DashboardState) => Promise<void>;
  onSave$: Observable<DashboardSaveWithChangeSources>;
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
  const onSaveSubscription = onSave$.subscribe(({ latestChangeBySource, ...saveEvent }) => {
    const changeSources = changeSourceTracker.markSaved(latestChangeBySource);
    lastSavedState$.next(saveEvent.dashboardState);
    reportDashboardSaved({ ...saveEvent, changeSources });
  });

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
      const hasUnsavedChanges = Object.keys(dashboardChanges ?? {}).length > 0;

      if (hasUnsavedChanges !== hasUnsavedChanges$.value) {
        hasUnsavedChanges$.next(hasUnsavedChanges);
      }

      if (storeUnsavedChanges) {
        const { time_restore, ...restOfDashboardChanges } = dashboardChanges;
        const hasEditsToBackUp = Object.keys(restOfDashboardChanges).length > 0;
        const changeSourcesToBackUp = changeSourceTracker.getUnsavedSources();
        const dashboardBackupState: DashboardBackupState = {
          // always back up view mode. This allows us to know which Dashboards were last changed while in edit mode.
          viewMode,
          ...restOfDashboardChanges,
          ...(hasEditsToBackUp &&
            changeSourcesToBackUp.length > 0 && { changeSources: changeSourcesToBackUp }),
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
    },
    internalApi: {
      getLastSavedState: () => lastSavedState$.value,
      unsavedChanges$: dashboardStateChanges$,
    },
  };
}
