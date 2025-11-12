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
  const projectRouting$ = new BehaviorSubject<ProjectRouting>(
    initialState.projectRouting
  );

  function setProjectRouting(projectRouting: ProjectRouting) {
    if (projectRouting !== projectRouting$.value) {
      projectRouting$.next(projectRouting);
    }
  }

  // If the dashboard has a saved projectRouting value, set it in CPS so the picker shows the correct value
  if (initialState.projectRouting && cpsService?.cpsManager) {
    cpsService.cpsManager.setProjectRouting(initialState.projectRouting);
  }

  // Subscribe to CPS's projectRouting$ to sync changes from the project picker
  const cpsProjectRoutingSubscription: Subscription | undefined = cpsService?.cpsManager
    ?.getProjectRouting$()
    .subscribe((cpsProjectRouting: ProjectRouting) => {
      // Always update when CPS changes (user interacted with picker)
      setProjectRouting(cpsProjectRouting);
    });

  const comparators = {
    projectRouting: (_a, _b, lastSavedState, latestState) => {
      // if projectRoutingRestore is set to false, projectRouting doesn't count as a change
      if (!projectRoutingRestore$.value) return true;
      // Compare values from the full state objects to preserve null vs undefined distinction
      // (using _a/_b directly would lose this because of ?? operator in diffComparators)
      const savedValue = lastSavedState?.projectRouting;
      const currentValue = latestState?.projectRouting;
      return savedValue === currentValue;
    },
  } as StateComparators<Pick<DashboardState, 'projectRouting'>>;

  const getState = (): Pick<DashboardState, 'projectRouting'> => {
    if (!projectRoutingRestore$.value) {
      // Don't save anything when projectRestore is false
      return {};
    }

    // When projectRestore is true, always save the value (null if undefined)
    return {
      projectRouting: projectRouting$.value ?? null,
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
        setProjectRouting(lastSavedState.projectRouting);
      },
    },
    cleanup: () => {
      cpsProjectRoutingSubscription?.unsubscribe();
    },
  };
}
