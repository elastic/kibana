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
  map,
  type Observable,
  tap,
  type Subject,
} from 'rxjs';

import type { HasLastSavedChildState } from '@kbn/presentation-containers';
import { childrenUnsavedChanges$ } from '@kbn/presentation-containers';
import type {
  PublishesSavedObjectId,
  PublishingSubject,
  ViewMode,
} from '@kbn/presentation-publishing';
import { apiHasSerializableState } from '@kbn/presentation-publishing';

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

  const childrenWithUnsavedChanges$: Observable<string[]> = childrenUnsavedChanges$(
    layoutManager.api.children$
  ).pipe(
    tap((childrenWithChanges) => {
      // propagate the latest serialized state back to the layout manager.
      for (const { uuid, hasUnsavedChanges } of childrenWithChanges) {
        const childApi = layoutManager.api.children$.value[uuid];
        if (!hasUnsavedChanges || !childApi || !apiHasSerializableState(childApi)) continue;
        layoutManager.internalApi.setChildState(uuid, childApi.serializeState());
      }
    }),
    map((childrenWithChanges) => {
      return childrenWithChanges
        .filter(({ hasUnsavedChanges }) => hasUnsavedChanges)
        .map(({ uuid }) => uuid);
    })
  );

  const dashboardStateChanges$ = combineLatest([
    settingsManager.internalApi.startComparing$(lastSavedState$),
    unifiedSearchManager.internalApi.startComparing$(lastSavedState$),
    layoutManager.internalApi.startComparing$(lastSavedState$),
    projectRoutingManager?.internalApi.startComparing$(lastSavedState$) ?? of({}),
  ]).pipe(
    map(([settings, unifiedSearch, panels, projectRouting]) => {
      console.log({ panels });
      return { ...settings, ...unifiedSearch, ...panels, ...projectRouting };
    })
  );

  const unsavedChangesSubscription = combineLatest([
    viewMode$,
    dashboardStateChanges$,
    childrenWithUnsavedChanges$,
  ])
    .pipe(debounceTime(DEBOUNCE_TIME))
    .subscribe(([viewMode, dashboardChanges, childrenWithUnsavedChanges]) => {
      console.log({ dashboardChanges });
      const hasDashboardChanges = Object.keys(dashboardChanges ?? {}).length > 0;
      const hasLayoutChanges = dashboardChanges.panels;
      const hasUnsavedChanges = hasDashboardChanges || Boolean(childrenWithUnsavedChanges.length);
      console.log({ childrenWithUnsavedChanges, dashboardChanges });

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

        // Backup latest state from children that have unsaved changes
        if (childrenWithUnsavedChanges.length || hasLayoutChanges) {
          const {
            panels: panelsWithUnsavedChanges = [],
            controlGroupInput: controlsWithUnsavedChanges = { controls: [] },
          } = layoutManager.internalApi.serializeLayout(childrenWithUnsavedChanges);

          const { panels, controlGroupInput, references } =
            layoutManager.internalApi.serializeLayout();

          console.log({
            childrenWithUnsavedChanges,
            panels,
            panelsWithUnsavedChanges,
            controlGroupInput,
            controlsWithUnsavedChanges,
            references,
          });

          // dashboardStateToBackup.references will be used instead of savedObjectResult.references
          // To avoid missing references, make sure references contains all references
          // even if panels or control group does not have unsaved changes
          dashboardBackupState.references = references ?? [];
          if (panelsWithUnsavedChanges.length) dashboardBackupState.panels = panels;
          if (controlsWithUnsavedChanges.controls.length)
            dashboardBackupState.controlGroupInput = controlGroupInput;
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
