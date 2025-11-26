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
  if (!cpsService?.cpsManager) {
    return;
  }

  const projectRouting$ = new BehaviorSubject<ProjectRouting>(initialState.project_routing);

  function setProjectRouting(projectRouting: ProjectRouting) {
    if (projectRouting !== projectRouting$.value) {
      projectRouting$.next(projectRouting);
    }
  }

  // pass the initial state to CPS manager from dashboard state or just reset to default on dashboard init
  cpsService.cpsManager.setProjectRouting(
    initialState.project_routing ?? cpsService.cpsManager.getDefaultProjectRouting()
  );

  // Subscribe to CPS's projectRouting$ to sync changes from the project picker
  const cpsProjectRoutingSubscription: Subscription | undefined = cpsService?.cpsManager
    ?.getProjectRouting$()
    .subscribe((cpsProjectRouting: ProjectRouting | undefined) => {
      setProjectRouting(cpsProjectRouting);
    });

  const comparators = {
    project_routing: (_a, _b, lastSavedState, _latestState) => {
      if (!projectRoutingRestore$.value) return true;
      const savedValue = lastSavedState?.project_routing;

      const currentValue = cpsService?.cpsManager?.getProjectRouting() ?? projectRouting$.value;
      return savedValue === currentValue;
    },
  } as StateComparators<Pick<DashboardState, 'project_routing'>>;

  const getState = (): Pick<DashboardState, 'project_routing'> => {
    if (!projectRoutingRestore$.value) {
      // Don't save anything when projectRestore is false
      return {};
    }

    // Read from CPS if available, otherwise use internal state
    return {
      project_routing: cpsService?.cpsManager?.getProjectRouting() ?? projectRouting$.value,
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
            if ('project_routing' in diff) {
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
          lastSavedState.project_routing ?? cpsService?.cpsManager?.getDefaultProjectRouting();
        setProjectRouting(routingValue);
        // Update CPS manager so picker reflects the reset value
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
