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
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  map,
  skipWhile,
  switchMap,
  tap,
} from 'rxjs';
import { getDashboardBackupService } from '../services/dashboard_backup_service';
import { initializePanelsManager } from './panels_manager';
import { initializeSettingsManager } from './settings_manager';
import { DashboardCreationOptions } from './types';
import { DashboardState } from '../../common';
import { initializeUnifiedSearchManager } from './unified_search_manager';
import { initializeViewModeManager } from './view_mode_manager';
import {
  CONTROL_GROUP_EMBEDDABLE_ID,
  initializeControlGroupManager,
} from './control_group_manager';

const DEBOUNCE_TIME = 100;

export function initializeUnsavedChangesManager({
  panelsManager,
  savedObjectId$,
  lastSavedState,
  settingsManager,
  viewModeManager,
  creationOptions,
  controlGroupManager,
  getReferences,
  unifiedSearchManager,
}: {
  lastSavedState: DashboardState;
  creationOptions?: DashboardCreationOptions;
  getReferences: (id: string) => Reference[];
  savedObjectId$: PublishesSavedObjectId['savedObjectId$'];
  controlGroupManager: ReturnType<typeof initializeControlGroupManager>;
  panelsManager: ReturnType<typeof initializePanelsManager>;
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
    onSave: (savedState: DashboardState, references: Reference[]) => void;
  };
} {
  const hasUnsavedChanges$ = new BehaviorSubject(false);
  // lastSavedState contains filters with injected references
  // references injected while loading dashboard saved object in loadDashboardState
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
    viewModeManager.api.viewMode$,
    dashboardStateChanges$,
    hasPanelChanges$,
    controlGroupManager.api.controlGroupApi$.pipe(
      skipWhile((controlGroupApi) => !controlGroupApi),
      switchMap((controlGroupApi) => {
        return controlGroupApi!.hasUnsavedChanges$;
      })
    ),
  ])
    .pipe(debounceTime(DEBOUNCE_TIME))
    .subscribe(([viewMode, dashboardChanges, hasPanelChanges, hasControlGroupChanges]) => {
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

        // always back up view mode. This allows us to know which Dashboards were last changed while in edit mode.
        dashboardStateToBackup.viewMode = viewMode;

        // Backup latest state from children that have unsaved changes
        if (hasPanelChanges || hasControlGroupChanges) {
          const { panels, references } = panelsManager.internalApi.serializePanels();
          const { controlGroupInput, controlGroupReferences } =
            controlGroupManager.internalApi.serializeControlGroup();
          // dashboardStateToBackup.references will be used instead of savedObjectResult.references
          // To avoid missing references, make sure references contains all references
          // even if panels or control group does not have unsaved changes
          dashboardStateToBackup.references = [...references, ...controlGroupReferences];
          if (hasPanelChanges) dashboardStateToBackup.panels = panels;
          if (hasControlGroupChanges) dashboardStateToBackup.controlGroupInput = controlGroupInput;
        }

        getDashboardBackupService().setState(savedObjectId$.value, dashboardStateToBackup);
      }
    });

  const getLastSavedStateForChild = (childId: string) => {
    const lastSavedDashboardState = lastSavedState$.value;

    if (childId === CONTROL_GROUP_EMBEDDABLE_ID) {
      return lastSavedDashboardState.controlGroupInput
        ? {
            rawState: lastSavedDashboardState.controlGroupInput,
            references: getReferences(CONTROL_GROUP_EMBEDDABLE_ID),
          }
        : undefined;
    }

    if (!lastSavedDashboardState.panels[childId]) return;
    return {
      rawState: lastSavedDashboardState.panels[childId].explicitInput,
      references: getReferences(childId),
    };
  };

  return {
    api: {
      asyncResetToLastSavedState: async () => {
        panelsManager.internalApi.resetPanels(lastSavedState$.value.panels);
        unifiedSearchManager.internalApi.reset(lastSavedState$.value);
        settingsManager.internalApi.reset(lastSavedState$.value);

        await controlGroupManager.api.controlGroupApi$.value?.resetUnsavedChanges();
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
      onSave: (savedState: DashboardState, references: Reference[]) => {
        // savedState contains filters with extracted references
        // lastSavedState$ should contain filters with injected references
        lastSavedState$.next(
          unifiedSearchManager.internalApi.injectReferences(savedState, references)
        );
      },
    },
  };
}
