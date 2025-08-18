/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { HasLastSavedChildState, childrenUnsavedChanges$ } from '@kbn/presentation-containers';
import {
  PublishesSavedObjectId,
  PublishingSubject,
  apiHasSerializableState,
} from '@kbn/presentation-publishing';
import { omit } from 'lodash';
import { BehaviorSubject, Observable, combineLatest, debounceTime, map, tap } from 'rxjs';
import {
  DashboardBackupState,
  getDashboardBackupService,
} from '../services/dashboard_backup_service';
import { initializeLayoutManager } from './layout_manager';
import { initializeSettingsManager } from './settings_manager';
import { DashboardCreationOptions } from './types';
import { DashboardState } from '../../common';
import { initializeUnifiedSearchManager } from './unified_search_manager';
import { initializeViewModeManager } from './view_mode_manager';

const DEBOUNCE_TIME = 100;

export function initializeUnsavedChangesManager({
  layoutManager,
  savedObjectId$,
  lastSavedState,
  settingsManager,
  viewModeManager,
  creationOptions,
  getReferences,
  unifiedSearchManager,
}: {
  lastSavedState: DashboardState;
  creationOptions?: DashboardCreationOptions;
  getReferences: (id: string) => Reference[];
  savedObjectId$: PublishesSavedObjectId['savedObjectId$'];
  layoutManager: ReturnType<typeof initializeLayoutManager>;
  viewModeManager: ReturnType<typeof initializeViewModeManager>;
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

  const hasPanelChanges$ = childrenUnsavedChanges$(layoutManager.api.children$).pipe(
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

  const dashboardStateChanges$: Observable<Partial<DashboardState>> = combineLatest([
    settingsManager.internalApi.startComparing$(lastSavedState$),
    unifiedSearchManager.internalApi.startComparing$(lastSavedState$),
    layoutManager.internalApi.startComparing$(lastSavedState$),
  ]).pipe(
    map(([settings, unifiedSearch, panels]) => {
      return { ...settings, ...unifiedSearch, ...panels };
    })
  );

  const unsavedChangesSubscription = combineLatest([
    viewModeManager.api.viewMode$,
    dashboardStateChanges$,
    hasPanelChanges$,
  ])
    .pipe(debounceTime(DEBOUNCE_TIME))
    .subscribe(([viewMode, dashboardChanges, hasPanelChanges]) => {
      const hasDashboardChanges = Object.keys(dashboardChanges ?? {}).length > 0;
      const hasUnsavedChanges = hasDashboardChanges || hasPanelChanges;

      if (hasUnsavedChanges !== hasUnsavedChanges$.value) {
        hasUnsavedChanges$.next(hasUnsavedChanges);
      }

      // backup unsaved changes if configured to do so
      if (creationOptions?.useSessionStorageIntegration) {
        const dashboardBackupState: DashboardBackupState = omit(dashboardChanges ?? {}, [
          'timeRange',
          'refreshInterval',
        ]);

        // always back up view mode. This allows us to know which Dashboards were last changed while in edit mode.
        dashboardBackupState.viewMode = viewMode;
        // Backup latest state from children that have unsaved changes
        if (hasPanelChanges) {
          const { panels, references } = layoutManager.internalApi.serializeLayout();
          // dashboardStateToBackup.references will be used instead of savedObjectResult.references
          // To avoid missing references, make sure references contains all references
          // even if panels or control group does not have unsaved changes
          dashboardBackupState.references = references ?? [];
          if (hasPanelChanges) dashboardBackupState.panels = panels;
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
