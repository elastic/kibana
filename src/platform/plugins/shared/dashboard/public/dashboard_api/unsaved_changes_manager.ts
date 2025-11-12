/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, combineLatest, debounceTime, first, map, skip, tap } from 'rxjs';

import type { HasLastSavedChildState } from '@kbn/presentation-containers';
import { childrenUnsavedChanges$ } from '@kbn/presentation-containers';
import type {
  PublishesSavedObjectId,
  PublishingSubject,
  ViewMode,
} from '@kbn/presentation-publishing';
import { apiHasSerializableState } from '@kbn/presentation-publishing';

import type { DashboardState } from '../../common';
import {
  getDashboardBackupService,
  type DashboardBackupState,
} from '../services/dashboard_backup_service';
import type { initializeFiltersManager } from './filters_manager';
import type { initializeLayoutManager } from './layout_manager';
import type { initializeSettingsManager } from './settings_manager';
import type { initializeUnifiedSearchManager } from './unified_search_manager';

const DEBOUNCE_TIME = 100;

export function initializeUnsavedChangesManager({
  layoutManager,
  filtersManager,
  savedObjectId$,
  lastSavedState,
  settingsManager,
  viewMode$,
  storeUnsavedChanges,
  unifiedSearchManager,
}: {
  lastSavedState: DashboardState;
  storeUnsavedChanges?: boolean;
  savedObjectId$: PublishesSavedObjectId['savedObjectId$'];
  layoutManager: ReturnType<typeof initializeLayoutManager>;
  filtersManager: ReturnType<typeof initializeFiltersManager>;
  viewMode$: PublishingSubject<ViewMode>;
  settingsManager: ReturnType<typeof initializeSettingsManager>;
  unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>;
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

  const hasChildrenUnsavedChanges$ = childrenUnsavedChanges$(layoutManager.api.children$).pipe(
    tap((childrenWithChanges) => {
      // propagate the latest serialized state back to the layout manager.
      for (const { uuid, hasUnsavedChanges } of childrenWithChanges) {
        const childApi = layoutManager.api.children$.value[uuid];
        if (!hasUnsavedChanges || !childApi || !apiHasSerializableState(childApi)) continue;
        layoutManager.internalApi.setChildState(uuid, childApi.serializeState());
      }
    }),
    map((childrenWithChanges) => {
      return childrenWithChanges.some(({ hasUnsavedChanges }) => hasUnsavedChanges);
    })
  );

  const dashboardStateChanges$ = combineLatest([
    settingsManager.internalApi.startComparing$(lastSavedState$),
    unifiedSearchManager.internalApi.startComparing$(lastSavedState$),
    layoutManager.internalApi.startComparing$(lastSavedState$),
  ]).pipe(
    map(([settings, unifiedSearch, panels]) => {
      return { ...settings, ...unifiedSearch, ...panels };
    })
  );

  const unsavedChangesSubscription = combineLatest([
    viewMode$,
    dashboardStateChanges$,
    hasChildrenUnsavedChanges$,
  ])
    .pipe(debounceTime(DEBOUNCE_TIME))
    .subscribe(([viewMode, dashboardChanges, hasChildrenUnsavedChanges]) => {
      const hasDashboardChanges = Object.keys(dashboardChanges ?? {}).length > 0;
      const hasLayoutChanges = dashboardChanges.panels;
      const hasUnsavedChanges = hasDashboardChanges || hasChildrenUnsavedChanges;

      if (hasUnsavedChanges !== hasUnsavedChanges$.value) {
        hasUnsavedChanges$.next(hasUnsavedChanges);
      }

      if (storeUnsavedChanges) {
        const { timeRestore, ...restOfDashboardChanges } = dashboardChanges;
        const dashboardBackupState: DashboardBackupState = {
          // always back up view mode. This allows us to know which Dashboards were last changed while in edit mode.
          viewMode,
          ...restOfDashboardChanges,
        };

        // always back up view mode. This allows us to know which Dashboards were last changed while in edit mode.
        dashboardBackupState.viewMode = viewMode;
        // Backup latest state from children that have unsaved changes
        if (hasChildrenUnsavedChanges || hasLayoutChanges) {
          const { panels, controlGroupInput, references } =
            layoutManager.internalApi.serializeLayout();
          // dashboardStateToBackup.references will be used instead of savedObjectResult.references
          // To avoid missing references, make sure references contains all references
          // even if panels or control group does not have unsaved changes
          dashboardBackupState.references = references ?? [];
          if (hasChildrenUnsavedChanges) {
            dashboardBackupState.panels = panels;
            dashboardBackupState.controlGroupInput = controlGroupInput;
          }
        }
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
        settingsManager.internalApi.reset(savedState);

        // when auto-apply is `false`, wait for children to update their filters, then publish
        if (!settingsManager.api.settings.autoApplyFilters$.getValue()) {
          filtersManager.api.unpublishedChildFilters$.pipe(skip(1), first()).subscribe(() => {
            filtersManager.api.publishFilters();
          });
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
