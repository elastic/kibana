/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProjectRouting } from '@kbn/es-query';
import type { PublishingSubject, StateComparators } from '@kbn/presentation-publishing';
import { diffComparators } from '@kbn/presentation-publishing';
import type { Subscription } from 'rxjs';
import { BehaviorSubject, combineLatestWith, debounceTime, map } from 'rxjs';
import { cpsService } from '../services/kibana_services';
import type { DashboardState } from '../../common';

export const COMPARE_DEBOUNCE = 100;

export function initializeProjectRoutingManager(
  initialState: DashboardState,
  projectRoutingRestore$: PublishingSubject<boolean>
) {
  const projectRouting$ = new BehaviorSubject<ProjectRouting>(initialState.projectRouting);

  function setProjectRouting(projectRouting: ProjectRouting) {
    if (projectRouting !== projectRouting$.value) {
      projectRouting$.next(projectRouting);
    }
  }

  // Set projectRouting in CPS: use saved value if exists (and not null), otherwise use default
  // This ensures the picker shows the correct value on dashboard load
  if (cpsService?.cpsManager) {
    const routingValue = initialState.projectRouting ?? cpsService.cpsManager.getDefaultProjectRouting();
    cpsService.cpsManager.setProjectRouting(routingValue);
  }

  // Subscribe to CPS's projectRouting$ to sync changes from the project picker
  const cpsProjectRoutingSubscription: Subscription | undefined = cpsService?.cpsManager
    ?.getProjectRouting$()
    .subscribe((cpsProjectRouting: ProjectRouting | undefined) => {
      setProjectRouting(cpsProjectRouting);
    });

  const comparators = {
    projectRouting: (_a, _b, lastSavedState, _latestState) => {
      if (!projectRoutingRestore$.value) return true;
      const savedValue = lastSavedState?.projectRouting;
      // Read from CPS if available, otherwise use internal state
      const currentValue = cpsService?.cpsManager?.getProjectRouting() ?? projectRouting$.value;
      return savedValue === currentValue;
    },
  } as StateComparators<Pick<DashboardState, 'projectRouting'>>;

  const getState = (): Pick<DashboardState, 'projectRouting'> => {
    if (!projectRoutingRestore$.value) {
      // Don't save anything when projectRestore is false
      return {};
    }

    // Read from CPS if available, otherwise use internal state
    const currentValue = cpsService?.cpsManager?.getProjectRouting() ?? projectRouting$.value;
    return {
      projectRouting: currentValue,
    };
  };

  return {
    api: {
      projectRouting$,
      setProjectRouting,
    },
    internalApi: {
      startComparing$: (lastSavedState$: BehaviorSubject<DashboardState>) => {
        return projectRouting$.pipe(
          debounceTime(COMPARE_DEBOUNCE),
          map(() => getState()),
          combineLatestWith(lastSavedState$),
          map(([latestState, lastSavedState]) => {
            const diff = diffComparators(comparators, lastSavedState, latestState);
            // Normalize the diff values using getState() to ensure undefined becomes null when projectRoutingRestore is true
            if ('projectRouting' in diff) {
              return getState();
            }
            return diff;
          })
        );
      },
      comparators,
      getState,
      reset: (lastSavedState: DashboardState) => {
        const routingValue =
          lastSavedState.projectRouting ?? cpsService?.cpsManager?.getDefaultProjectRouting();
        setProjectRouting(routingValue);
        // Also update CPS manager so picker reflects the reset value
        if (cpsService?.cpsManager) {
          cpsService.cpsManager.setProjectRouting(routingValue);
        }
      },
    },
    cleanup: () => {
      cpsProjectRoutingSubscription?.unsubscribe();
    },
  };
}
