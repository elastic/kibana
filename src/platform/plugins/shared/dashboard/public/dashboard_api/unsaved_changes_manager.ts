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
  apiHasSerializableState,
} from '@kbn/presentation-publishing';
import { omit } from 'lodash';
import { BehaviorSubject, Observable, combineLatest, debounceTime, map, of, tap } from 'rxjs';
import { getDashboardBackupService } from '../services/dashboard_backup_service';
import { initializePanelsManager } from './panels_manager';
import { initializeSettingsManager } from './settings_manager';
import { DashboardCreationOptions, DashboardState } from './types';
import { initializeUnifiedSearchManager } from './unified_search_manager';

const DEBOUNCE_TIME = 100;

export function initializeUnsavedChangesManager({
  creationOptions,
  controlGroupApi$,
  lastSavedState,
  panelsManager,
  savedObjectId$,
  settingsManager,
  unifiedSearchManager,
  getPanelReferences,
}: {
  creationOptions?: DashboardCreationOptions;
  getPanelReferences: (id: string) => Reference[];
  controlGroupApi$: PublishingSubject<ControlGroupApi | undefined>;
  lastSavedState: DashboardState;
  savedObjectId$: PublishesSavedObjectId['savedObjectId$'];
  panelsManager: ReturnType<typeof initializePanelsManager>;
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

  const hasPanelChanges$ = childrenUnsavedChanges$(panelsManager.api.children$).pipe(
    tap((childrenWithChanges) => {
      // propagate the latest serialized state back to the panels manager.
      for (const { uuid, hasUnsavedChanges } of childrenWithChanges) {
        const childApi = panelsManager.api.children$.value[uuid];
        if (!hasUnsavedChanges || !childApi || !apiHasSerializableState(childApi)) continue;

        panelsManager.internalApi.setChildState(uuid, childApi.serializeState());
      }
    }),
    map((childrenWithChanges) => {
      return childrenWithChanges.some(({ hasUnsavedChanges }) => hasUnsavedChanges);
    })
  );

  const dashboardStateChanges$: Observable<Partial<DashboardState>> = combineLatest([
    settingsManager.internalApi.startComparing$(lastSavedState$),
    unifiedSearchManager.internalApi.startComparing$(lastSavedState$),
    panelsManager.internalApi.startComparing$(lastSavedState$),
  ]).pipe(
    map(([settings, unifiedSearch, panels]) => {
      return { ...settings, ...unifiedSearch, ...panels };
    })
  );

  const unsavedChangesSubscription = combineLatest([
    dashboardStateChanges$,
    hasPanelChanges$,
    of(false), // SERIALIZED STATE ONLY TODO reinstate Dashboard diff checking of Controls state - maybe with the new State Manager object
  ])
    .pipe(debounceTime(DEBOUNCE_TIME))
    .subscribe(([dashboardChanges, hasPanelChanges, hasControlGroupChanges]) => {
      const hasDashboardChanges = Object.keys(dashboardChanges ?? {}).length > 0;
      const hasUnsavedChanges = hasDashboardChanges || hasPanelChanges || hasControlGroupChanges;

      if (hasUnsavedChanges !== hasUnsavedChanges$.value) {
        hasUnsavedChanges$.next(hasUnsavedChanges);
      }

      // backup unsaved changes if configured to do so
      if (creationOptions?.useSessionStorageIntegration) {
        const dashboardStateToBackup: Partial<DashboardState> = omit(dashboardChanges ?? {}, [
          'timeRange',
          'refreshInterval',
        ]);

        // Backup latest state from children that have unsaved changes
        if (hasPanelChanges) {
          const { panels, references } = panelsManager.internalApi.serializePanels();
          dashboardStateToBackup.panels = panels;
          dashboardStateToBackup.references = references;
        }

        // SERIALIZED STATE ONLY TODO back up controls state.

        getDashboardBackupService().setState(savedObjectId$.value, dashboardChanges);
      }
    });

  const getLastSavedStateForChild = (panelId: string) => {
    const lastSavedDashboardState = lastSavedState$.value;
    if (!lastSavedDashboardState.panels[panelId]) return;
    return {
      rawState: lastSavedDashboardState.panels[panelId].explicitInput,
      references: getPanelReferences(panelId),
    };
  };

  return {
    api: {
      asyncResetToLastSavedState: async () => {
        panelsManager.internalApi.resetPanels(lastSavedState$.value.panels);
        unifiedSearchManager.internalApi.reset(lastSavedState$.value);
        settingsManager.internalApi.reset(lastSavedState$.value);

        // SERIALIZED STATE ONLY TODO: Remove asyncResetUnsavedChanges because the reset function can now be async.
        await controlGroupApi$.value?.asyncResetUnsavedChanges();
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
