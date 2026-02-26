/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, combineLatest, debounceTime, map, type Subject } from 'rxjs';

import type { HasLastSavedChildState } from '@kbn/presentation-publishing';
import type {
  PublishesSavedObjectId,
  PublishingSubject,
  ViewMode,
} from '@kbn/presentation-publishing';

import { of } from 'rxjs';
import type { DashboardState } from '../../common';
import {
  getDashboardBackupService,
  type DashboardBackupState,
} from '../services/dashboard_backup_service';
import type { initializeLayoutManager } from './layout_manager';
import type { initializeProjectRoutingManager } from './project_routing_manager';
import type { initializeSettingsManager } from './settings_manager';
import type { initializeUnifiedSearchManager } from './unified_search_manager';

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
  forcePublishOnReset$,
}: {
  lastSavedState: DashboardState;
  storeUnsavedChanges?: boolean;
  savedObjectId$: PublishesSavedObjectId['savedObjectId$'];
  layoutManager: ReturnType<typeof initializeLayoutManager>;
  viewMode$: PublishingSubject<ViewMode>;
  settingsManager: ReturnType<typeof initializeSettingsManager>;
  unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>;
  projectRoutingManager?: ReturnType<typeof initializeProjectRoutingManager>;
  forcePublishOnReset$: Subject<void>;
}): {
  api: {
    hasUnsavedChanges$: PublishingSubject<boolean>;
    asyncResetToLastSavedState: () => Promise<void>;
  } & HasLastSavedChildState;
  cleanup: () => void;
  internalApi: {
    getLastSavedState: () => DashboardState;
    onSave: (savedState: DashboardState) => void;
  };
} {
  const hasUnsavedChanges$ = new BehaviorSubject(false);

  const lastSavedState$ = new BehaviorSubject<DashboardState>(lastSavedState);

  const dashboardStateChanges$ = combineLatest([
    settingsManager.internalApi.startComparing(lastSavedState$),
    unifiedSearchManager.internalApi.startComparing(lastSavedState$),
    layoutManager.internalApi.startComparing(lastSavedState$),
    projectRoutingManager?.internalApi.startComparing(lastSavedState$) ?? of({}),
  ]).pipe(
    map(([settings, unifiedSearch, layout, projectRouting]) => {
      return { ...settings, ...unifiedSearch, ...layout, ...projectRouting };
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

  return {
    api: {
      asyncResetToLastSavedState: async () => {
        const savedState = lastSavedState$.value;
        layoutManager.internalApi.reset();
        unifiedSearchManager.internalApi.reset(savedState);
        projectRoutingManager?.internalApi.reset(savedState);
        settingsManager.internalApi.reset(savedState);

        // when auto-apply is `false`, wait for children to update their filters + time slice + variables, then publish
        if (!settingsManager.api.settings.autoApplyFilters$.getValue()) {
          forcePublishOnReset$.next();
        }
      },
      hasUnsavedChanges$,
      lastSavedStateForChild$: (panelId: string) =>
        lastSavedState$.pipe(map(() => getLastSavedStateForChild(panelId))),
      getLastSavedStateForChild,
    },
    cleanup: () => {
      unsavedChangesSubscription.unsubscribe();
    },
    internalApi: {
      getLastSavedState: () => lastSavedState$.value,
      onSave: (savedState: DashboardState) => {
        lastSavedState$.next(savedState);
      },
    },
  };
}
