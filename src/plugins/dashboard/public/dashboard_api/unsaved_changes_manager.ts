/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subject, combineLatest, skipWhile, switchMap } from 'rxjs';
import { PublishingSubject } from '@kbn/presentation-publishing';
import { ControlGroupApi } from '@kbn/controls-plugin/public';
import { childrenUnsavedChanges$, initializeUnsavedChanges } from '@kbn/presentation-containers';
import { DashboardCreationOptions, DashboardState } from './types';
import { initializePanelsManager } from './panels_manager';
import { initializeSettingsManager } from './settings_manager';
import { initializeUnifiedSearchManager } from './unified_search_manager';
import { PANELS_CONTROL_GROUP_KEY } from '../services/dashboard_backup_service';

export function initializeUnsavedChangesManager({
  anyMigrationRun,
  creationOptions,
  controlGroupApi$,
  lastSavedState,
  panelsManager,
  settingsManager,
  unifiedSearchManager,
}: {
  anyMigrationRun: boolean;
  creationOptions?: DashboardCreationOptions;
  controlGroupApi$: PublishingSubject<ControlGroupApi | undefined>;
  lastSavedState: DashboardState;
  panelsManager: ReturnType<typeof initializePanelsManager>;
  settingsManager: ReturnType<typeof initializeSettingsManager>;
  unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>;
}) {
  const hasRunMigrations$ = new BehaviorSubject(anyMigrationRun);
  const hasUnsavedChanges$ = new BehaviorSubject(false);
  const lastSavedState$ = new BehaviorSubject<DashboardState>(lastSavedState);
  const saveNotification$ = new Subject<void>();

  const dashboardUnsavedChanges = initializeUnsavedChanges<
    Omit<
      DashboardState,
      | 'controlGroupInput'
      | 'controlGroupState'
      | 'executionContext'
      | 'timeslice'
      | 'tags'
      | 'viewMode'
    >
  >(
    lastSavedState,
    { saveNotification$ },
    {
      ...panelsManager.comparators,
      ...settingsManager.comparators,
      ...unifiedSearchManager.comparators,
    }
  );

  const unsavedChangesSubscription = combineLatest([
    dashboardUnsavedChanges.api.unsavedChanges,
    childrenUnsavedChanges$(panelsManager.api.children$),
    controlGroupApi$.pipe(
      skipWhile((controlGroupApi) => !controlGroupApi),
      switchMap((controlGroupApi) => {
        return controlGroupApi!.unsavedChanges;
      })
    ),
  ]).subscribe(([dashboardChanges, unsavedPanelState, controlGroupChanges]) => {
    const hasUnsavedChanges =
      dashboardChanges !== undefined ||
      unsavedPanelState !== undefined ||
      controlGroupChanges !== undefined;
    if (hasUnsavedChanges !== hasUnsavedChanges$.value) {
      hasUnsavedChanges$.next(hasUnsavedChanges);
    }

    // backup unsaved changes if configured to do so
    if (creationOptions?.useSessionStorageIntegration) {
      const reactEmbeddableChanges = unsavedPanelState ? { ...unsavedPanelState } : {};
      if (controlGroupChanges) {
        reactEmbeddableChanges[PANELS_CONTROL_GROUP_KEY] = controlGroupChanges;
      }
      // backupUnsavedChanges.bind(this)(dashboardChanges, reactEmbeddableChanges);
    }
  });

  return {
    api: {
      asyncResetToLastSavedState: async () => {
        panelsManager.internalApi.reset(lastSavedState$.value);
        settingsManager.internalApi.reset(lastSavedState$.value);
        unifiedSearchManager.internalApi.reset(lastSavedState$.value);
        await controlGroupApi$.value?.asyncResetUnsavedChanges();
      },
      hasRunMigrations$,
      hasUnsavedChanges$,
      saveNotification$,
    },
    cleanup: () => {
      dashboardUnsavedChanges.cleanup();
      unsavedChangesSubscription.unsubscribe();
    },
    internalApi: {
      onSave: (savedState: DashboardState) => {
        lastSavedState$.next(savedState);

        // if we set the last saved input, it means we have saved this Dashboard - therefore clientside migrations have
        // been serialized into the SO.
        hasRunMigrations$.next(false);

        saveNotification$.next();
      },
    },
  };
}
