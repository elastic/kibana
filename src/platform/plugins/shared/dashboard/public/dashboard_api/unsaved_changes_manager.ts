/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { HasLastSavedChildState } from '@kbn/presentation-containers';
import { childrenUnsavedChanges$ } from '@kbn/presentation-containers';
import type {
  PublishesSavedObjectId,
  PublishingSubject,
  ViewMode,
} from '@kbn/presentation-publishing';
import { apiHasSerializableState } from '@kbn/presentation-publishing';
import { BehaviorSubject, combineLatest, debounceTime, map, skipWhile, switchMap, tap } from 'rxjs';
import type { DashboardBackupState } from '../services/dashboard_backup_service';
import { getDashboardBackupService } from '../services/dashboard_backup_service';
import type { initializeLayoutManager } from './layout_manager';
import type { initializeSettingsManager } from './settings_manager';
import type { DashboardState } from '../../common';
import type { initializeUnifiedSearchManager } from './unified_search_manager';
import type { initializeProjectRoutingManager } from './project_routing_manager';
import type { initializeControlGroupManager } from './control_group_manager';
import { CONTROL_GROUP_EMBEDDABLE_ID } from './control_group_manager';

const DEBOUNCE_TIME = 100;

export function initializeUnsavedChangesManager({
  layoutManager,
  savedObjectId$,
  lastSavedState,
  settingsManager,
  viewMode$,
  storeUnsavedChanges,
  controlGroupManager,
  getReferences,
  unifiedSearchManager,
  projectRoutingManager,
}: {
  lastSavedState: DashboardState;
  storeUnsavedChanges?: boolean;
  getReferences: (id: string) => Reference[];
  savedObjectId$: PublishesSavedObjectId['savedObjectId$'];
  controlGroupManager: ReturnType<typeof initializeControlGroupManager>;
  layoutManager: ReturnType<typeof initializeLayoutManager>;
  viewMode$: PublishingSubject<ViewMode>;
  settingsManager: ReturnType<typeof initializeSettingsManager>;
  unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>;
  projectRoutingManager: ReturnType<typeof initializeProjectRoutingManager>;
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
    projectRoutingManager.internalApi.startComparing$(lastSavedState$),
    layoutManager.internalApi.startComparing$(lastSavedState$),
  ]).pipe(
    map(([settings, unifiedSearch, projectRouting, panels]) => {
      return { ...settings, ...unifiedSearch, ...projectRouting, ...panels };
    })
  );

  const unsavedChangesSubscription = combineLatest([
    viewMode$,
    dashboardStateChanges$,
    hasChildrenUnsavedChanges$,
    controlGroupManager.api.controlGroupApi$.pipe(
      skipWhile((controlGroupApi) => !controlGroupApi),
      switchMap((controlGroupApi) => {
        return controlGroupApi!.hasUnsavedChanges$;
      })
    ),
  ])
    .pipe(debounceTime(DEBOUNCE_TIME))
    .subscribe(
      ([viewMode, dashboardChanges, hasChildrenUnsavedChanges, hasControlGroupChanges]) => {
        const hasDashboardChanges = Object.keys(dashboardChanges ?? {}).length > 0;
        const hasLayoutChanges = dashboardChanges.panels;
        const hasUnsavedChanges =
          hasDashboardChanges || hasChildrenUnsavedChanges || hasControlGroupChanges;

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

          // Backup latest state from children that have unsaved changes
          if (hasChildrenUnsavedChanges || hasControlGroupChanges || hasLayoutChanges) {
            const { panels, references } = layoutManager.internalApi.serializeLayout();
            const { controlGroupInput, controlGroupReferences } =
              controlGroupManager.internalApi.serializeControlGroup();
            // dashboardStateToBackup.references will be used instead of savedObjectResult.references
            // To avoid missing references, make sure references contains all references
            // even if panels or control group does not have unsaved changes
            dashboardBackupState.references = [...(references ?? []), ...controlGroupReferences];
            if (hasChildrenUnsavedChanges) dashboardBackupState.panels = panels;
            if (hasControlGroupChanges) dashboardBackupState.controlGroupInput = controlGroupInput;
          }

          getDashboardBackupService().setState(savedObjectId$.value, dashboardBackupState);
        }
      }
    );

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

    return layoutManager.internalApi.getLastSavedStateForPanel(childId);
  };

  return {
    api: {
      asyncResetToLastSavedState: async () => {
        const savedState = lastSavedState$.value;
        layoutManager.internalApi.reset();
        unifiedSearchManager.internalApi.reset(savedState);
        projectRoutingManager.internalApi.reset(savedState);
        settingsManager.internalApi.reset(savedState);

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
      onSave: (savedState: DashboardState) => {
        lastSavedState$.next(savedState);
      },
    },
  };
}
