/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { ControlGroupApi } from '@kbn/controls-plugin/public';
import { HasLastSavedChildState, childrenUnsavedChanges$ } from '@kbn/presentation-containers';
import {
  PublishesSavedObjectId,
  PublishingSubject,
  SerializedPanelState,
  StateComparators,
  diffComparators$,
  getUnchangingComparator,
} from '@kbn/presentation-publishing';
import { cloneDeep, omit } from 'lodash';
import {
  BehaviorSubject,
  Subject,
  combineLatest,
  debounceTime,
  map,
  skipWhile,
  switchMap,
} from 'rxjs';
import { getDashboardBackupService } from '../services/dashboard_backup_service';
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
  getPanelReferences,
}: {
  getPanelReferences: (id: string) => Reference[];
  creationOptions?: DashboardCreationOptions;
  controlGroupApi$: PublishingSubject<ControlGroupApi | undefined>;
  lastSavedState: DashboardState | undefined;
  panelsManager: ReturnType<typeof initializePanelsManager>;
  savedObjectId$: PublishesSavedObjectId['savedObjectId$'];
  settingsManager: ReturnType<typeof initializeSettingsManager>;
  viewModeManager: ReturnType<typeof initializeViewModeManager>;
  unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>;
  referencesComparator: StateComparators<Pick<DashboardState, 'references'>>;
}) {
  const hasUnsavedChanges$ = new BehaviorSubject(false);
  const lastSavedState$ = new BehaviorSubject<DashboardState | undefined>(lastSavedState);
  const saveNotification$ = new Subject<void>();

  const dashboardChangesSource$ = diffComparators$<DashboardState>(lastSavedState$, {
    ...panelsManager.comparators,
    ...settingsManager.comparators,
    ...viewModeManager.comparators,
    ...unifiedSearchManager.comparators,
    ...referencesComparator,

    tags: getUnchangingComparator(),
    controlGroupInput: getUnchangingComparator(),
    controlGroupState: getUnchangingComparator(),
  });
  const panelsChangesSource$ = childrenUnsavedChanges$(panelsManager.api.children$).pipe(
    map((childrenWithChanges) => {
      const changedPanelStates: { [key: string]: SerializedPanelState<object> } = {};
      for (const { uuid, hasUnsavedChanges } of childrenWithChanges) {
        if (!hasUnsavedChanges) continue;
        const childApi = panelsManager.api.children$.value[uuid];
        if (!childApi) continue;
        changedPanelStates[uuid] = childApi.serializeState();
      }
      if (Object.keys(changedPanelStates).length === 0) return undefined;
      return changedPanelStates;
    })
  );
  const controlGroupChangesSource$ = controlGroupApi$.pipe(
    skipWhile((api) => !api),
    switchMap((api) => api!.unsavedChanges$),
    map((changes) => {
      if (Object.keys(changes).length > 0) {
        return controlGroupApi$.value?.serializeState();
      }
      return undefined;
    })
  );

  const unsavedChangesSubscription = combineLatest([dashboardChangesSource$, panelsChangesSource$])
    .pipe(debounceTime(0))
    .subscribe(([dashboardChanges, unsavedPanelState]) => {
      const controlGroupChanges = undefined;
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
      const allReferences: Reference[] = [];

      // backup unsaved changes if configured to do so
      if (creationOptions?.useSessionStorageIntegration) {
        // Current behaviour expects time range not to be backed up. Revisit this?
        const dashboardStateToBackup: Partial<DashboardState> = omit(dashboardChanges ?? {}, [
          'timeRange',
          'refreshInterval',
        ]);
        // apply control group changes.
        // if (controlGroupChanges) {
        //   allReferences.concat(controlGroupChanges.references ?? []);
        //   dashboardStateToBackup.controlGroupInput = controlGroupChanges.rawState;
        // }

        // apply panels changes
        if (unsavedPanelState) {
          const currentPanels = panelsManager.internalApi.getState().panels;
          dashboardStateToBackup.panels = {};
          for (const [uuid, serializedPanelState] of Object.entries(unsavedPanelState)) {
            allReferences.concat(serializedPanelState.references ?? []);
            dashboardStateToBackup.panels[uuid] = {
              ...currentPanels[uuid],
              explicitInput: { ...serializedPanelState.rawState, id: uuid },
            };
          }
        }
        dashboardStateToBackup.references = allReferences;

        // getDashboardBackupService().setState(savedObjectId$.value, dashboardStateToBackup);
      }
    });

  const lastSavedChildStateApi: HasLastSavedChildState = {
    saveNotification$,
    getLastSavedStateForChild: (uuid: string) => {
      if (!lastSavedState$.value?.panels[uuid]) return;
      const rawState = omit(
        lastSavedState$.value?.panels[uuid]?.explicitInput,
        'id' // omit Dashboard injected id copy.
      );

      // Dashboard injects enhancements key even when no enhancements are present.
      if (Object.keys(rawState.enhancements ?? {}).length === 0) {
        delete rawState.enhancements;
      }
      return {
        rawState,
        references: getPanelReferences(uuid),
      };
    },
  };

  return {
    api: {
      asyncResetToLastSavedState: async () => {
        if (!lastSavedState$.value) return;
        panelsManager.internalApi.reset(lastSavedState$.value);
        settingsManager.internalApi.reset(lastSavedState$.value);
        unifiedSearchManager.internalApi.reset(lastSavedState$.value);
        await controlGroupApi$.value?.asyncResetUnsavedChanges();
      },
      ...lastSavedChildStateApi,
      hasUnsavedChanges$,
    },
    cleanup: () => {
      unsavedChangesSubscription.unsubscribe();
    },
    internalApi: {
      getLastSavedState: () => lastSavedState$.value,
      onSave: (savedState: DashboardState) => {
        lastSavedState$.next(cloneDeep(savedState));
        saveNotification$.next();
      },
    },
  };
}
