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
import { BehaviorSubject, combineLatestWith, debounceTime, map } from 'rxjs';
import { coreServices } from '../services/kibana_services';
import type { DashboardState } from '../../common';

export const COMPARE_DEBOUNCE = 100;

export function initializeProjectRoutingManager(initialState: DashboardState) {
  const projectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(
    initialState.projectRouting
  );

  function setProjectRouting(projectRouting: ProjectRouting | undefined) {
    if (projectRouting !== projectRouting$.value) {
      console.log('Dashboard: setProjectRouting called with:', projectRouting);
      projectRouting$.next(projectRouting);
    }
  }

  // Subscribe to Chrome's projectRouting$ to sync global project routing changes to dashboard
  const chromeProjectRoutingSubscription = coreServices.chrome.project
    .getProjectRouting$()
    .subscribe((chromeProjectRouting) => {
      console.log('Dashboard: Chrome projectRouting changed to:', chromeProjectRouting);
      setProjectRouting(chromeProjectRouting);
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
      chromeProjectRoutingSubscription.unsubscribe();
    },
  };
}
