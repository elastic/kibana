/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlGroupApi } from '@kbn/controls-plugin/public';
import { childrenUnsavedChanges$, initializeUnsavedChanges } from '@kbn/presentation-containers';
import {
  PublishesSavedObjectId,
  PublishingSubject,
  StateComparators,
} from '@kbn/presentation-publishing';
import { omit } from 'lodash';
import { BehaviorSubject, Subject, combineLatest, debounceTime, skipWhile, switchMap } from 'rxjs';
import {
  PANELS_CONTROL_GROUP_KEY,
  getDashboardBackupService,
} from '../services/dashboard_backup_service';
import { initializePanelsManager } from './panels_manager';
import { initializeSettingsManager } from './settings_manager';
import { DashboardCreationOptions, DashboardState } from './types';
import { initializeUnifiedSearchManager } from './unified_search_manager';
import { initializeViewModeManager } from './view_mode_manager';

export function initializeUnsavedChangesManager({
  creationOptions,
  controlGroupApi$,
  lastSavedState,
  panelsManager,
  savedObjectId$,
  settingsManager,
  viewModeManager,
  unifiedSearchManager,
  referencesComparator,
}: {
  creationOptions?: DashboardCreationOptions;
  controlGroupApi$: PublishingSubject<ControlGroupApi | undefined>;
  lastSavedState: DashboardState;
  panelsManager: ReturnType<typeof initializePanelsManager>;
  savedObjectId$: PublishesSavedObjectId['savedObjectId$'];
  settingsManager: ReturnType<typeof initializeSettingsManager>;
  viewModeManager: ReturnType<typeof initializeViewModeManager>;
  unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>;
  referencesComparator: StateComparators<Pick<DashboardState, 'references'>>;
}) {
  const hasUnsavedChanges$ = new BehaviorSubject(false);
  const lastSavedState$ = new BehaviorSubject<DashboardState>(lastSavedState);
  const saveNotification$ = new Subject<void>();

  const dashboardUnsavedChanges = initializeUnsavedChanges<
    Omit<DashboardState, 'controlGroupInput' | 'controlGroupState' | 'timeslice' | 'tags'>
  >(
    lastSavedState,
    { saveNotification$ },
    {
      ...panelsManager.comparators,
      ...settingsManager.comparators,
      ...viewModeManager.comparators,
      ...unifiedSearchManager.comparators,
      ...referencesComparator,
    }
  );

  const unsavedChangesSubscription = combineLatest([
    dashboardUnsavedChanges.api.unsavedChanges$,
    childrenUnsavedChanges$(panelsManager.api.children$),
    controlGroupApi$.pipe(
      skipWhile((controlGroupApi) => !controlGroupApi),
      switchMap((controlGroupApi) => {
        return controlGroupApi!.unsavedChanges$;
      })
    ),
  ])
    .pipe(debounceTime(0))
    .subscribe(([dashboardChanges, unsavedPanelState, controlGroupChanges]) => {
      /**
       * viewMode needs to be stored in session state because its used to exclude 'view' dashboards on the listing page
       * However, viewMode differences should not trigger unsaved changes notification otherwise, opening a dashboard in
       * edit mode will always show unsaved changes. Similarly, differences in references are derived from panels, so
       * we don't consider them unsaved changes
       */
      const hasDashboardChanges =
        Object.keys(omit(dashboardChanges ?? {}, ['viewMode', 'references'])).length > 0;
      const hasUnsavedChanges =
        hasDashboardChanges || unsavedPanelState !== undefined || controlGroupChanges !== undefined;
      if (hasUnsavedChanges !== hasUnsavedChanges$.value) {
        hasUnsavedChanges$.next(hasUnsavedChanges);
      }

      // backup unsaved changes if configured to do so
      if (creationOptions?.useSessionStorageIntegration) {
        // Current behaviour expects time range not to be backed up. Revisit this?
        const dashboardStateToBackup = omit(dashboardChanges ?? {}, [
          'timeRange',
          'refreshInterval',
        ]);
        const reactEmbeddableChanges = unsavedPanelState ? { ...unsavedPanelState } : {};
        if (controlGroupChanges) {
          reactEmbeddableChanges[PANELS_CONTROL_GROUP_KEY] = controlGroupChanges;
        }

        getDashboardBackupService().setState(
          savedObjectId$.value,
          dashboardStateToBackup,
          reactEmbeddableChanges
        );
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
      hasUnsavedChanges$,
      saveNotification$,
    },
    cleanup: () => {
      dashboardUnsavedChanges.cleanup();
      unsavedChangesSubscription.unsubscribe();
    },
    internalApi: {
      getLastSavedState: () => lastSavedState$.value,
      onSave: (savedState: DashboardState) => {
        lastSavedState$.next(savedState);
        // sync panels manager with latest saved state
        panelsManager.internalApi.setPanels(savedState.panels);
        saveNotification$.next();
      },
    },
  };
}
