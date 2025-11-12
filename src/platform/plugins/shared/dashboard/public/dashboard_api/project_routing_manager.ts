/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProjectRouting } from '@kbn/es-query';
import type { StateComparators } from '@kbn/presentation-publishing';
import { diffComparators } from '@kbn/presentation-publishing';
import type { Subscription } from 'rxjs';
import { BehaviorSubject, combineLatestWith, debounceTime, map } from 'rxjs';
import { cpsService } from '../services/kibana_services';
import type { DashboardState } from '../../common';

export const COMPARE_DEBOUNCE = 100;

export function initializeProjectRoutingManager(initialState: DashboardState) {
  const projectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(
    initialState.projectRouting
  );

  function setProjectRouting(projectRouting: ProjectRouting | undefined) {
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
    .subscribe((cpsProjectRouting: ProjectRouting | undefined) => {
      // Always update when CPS changes (user interacted with picker)
      setProjectRouting(cpsProjectRouting);
    });

  const comparators = {
    projectRouting: 'deepEquality',
  } as StateComparators<Pick<DashboardState, 'projectRouting'>>;

  const getState = (): Pick<DashboardState, 'projectRouting'> => {
    return {
      ...(projectRouting$.value && { projectRouting: projectRouting$.value }),
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
          map((projectRouting) => ({ projectRouting })),
          combineLatestWith(lastSavedState$),
          map(([latestState, lastSavedState]) =>
            diffComparators(comparators, lastSavedState, latestState)
          )
        );
      },
      comparators,
      getState,
      reset: (lastSavedState: DashboardState) => {
        setProjectRouting(lastSavedState.projectRouting as ProjectRouting | undefined);
      },
    },
    cleanup: () => {
      cpsProjectRoutingSubscription?.unsubscribe();
    },
  };
}
