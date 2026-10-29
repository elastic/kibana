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
import { BehaviorSubject, map, skip } from 'rxjs';
import { ProjectRoutingAccess } from '@kbn/cps-utils';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { cpsService } from '../services/kibana_services';

type ProjectRoutingState = Pick<DashboardState, 'project_routing'>;

/** Unsaved-changes comparator of the project routing, which counts only with project routing restore on. */
const getProjectRoutingComparators = (
  isProjectRoutingRestore: () => boolean
): StateComparators<ProjectRoutingState> => ({
  project_routing: (a, b) => !isProjectRoutingRestore() || a === b,
});

/** The project routing change from `baseline` to `current`, as unsaved changes reports it. */
export const diffProjectRoutingState = (
  baseline: ProjectRoutingState,
  current: ProjectRoutingState,
  isProjectRoutingRestore: boolean
): Partial<ProjectRoutingState> =>
  diffComparators(
    getProjectRoutingComparators(() => isProjectRoutingRestore),
    baseline,
    current
  );

export function initializeProjectRoutingManager(
  initialState: DashboardState,
  projectRoutingRestore$: PublishingSubject<boolean>
) {
  if (!cpsService?.cpsManager) {
    return;
  }
  const cpsManager = cpsService.cpsManager;

  cpsManager.registerAppAccess('dashboards', (location: string) =>
    location.includes('#/list') ? ProjectRoutingAccess.DISABLED : ProjectRoutingAccess.EDITABLE
  );

  const projectRouting$ = new BehaviorSubject<ProjectRouting>(initialState.project_routing);

  // pass the initial state to CPS manager from dashboard state if set
  if (initialState.project_routing) {
    cpsManager.setProjectRouting(initialState.project_routing);
  }

  function setProjectRouting(projectRouting: ProjectRouting) {
    if (projectRouting !== projectRouting$.value) {
      projectRouting$.next(projectRouting);
      cpsManager.setProjectRouting(projectRouting);
    }
  }

  // Subscribe to CPS's projectRouting$ to sync changes from the project picker
  const cpsProjectRoutingSubscription: Subscription | undefined = cpsManager
    .getProjectRouting$()
    .subscribe((cpsProjectRouting: ProjectRouting | undefined) => {
      setProjectRouting(cpsProjectRouting);
    });

  const comparators = getProjectRoutingComparators(() => projectRoutingRestore$.value);

  const getState = (): ProjectRoutingState => {
    if (!projectRoutingRestore$.value) {
      // Don't save anything when projectRestore is false
      return {};
    }

    // Read from CPS if available, otherwise use internal state
    return {
      project_routing: projectRouting$.value,
    };
  };

  const anyStateChange$ = projectRouting$.pipe(
    skip(1),
    map(() => undefined)
  );

  return {
    api: {
      projectRouting$,
      setProjectRouting,
    },
    internalApi: {
      anyStateChange$,
      comparators,
      getState,
      reset: (lastSavedState: DashboardState) => {
        setProjectRouting(lastSavedState.project_routing ?? cpsManager.getDefaultProjectRouting());
      },
    },
    cleanup: () => {
      cpsProjectRoutingSubscription?.unsubscribe();
    },
  };
}
