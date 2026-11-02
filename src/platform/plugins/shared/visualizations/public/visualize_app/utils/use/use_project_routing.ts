/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import { BehaviorSubject, type Observable } from 'rxjs';
import type { VisualizeServices } from '../../types';

export interface ProjectRoutingManager {
  getProjectRouting: () => ProjectRouting | undefined;
  getProjectRouting$: () => Observable<ProjectRouting | undefined>;
}

export function useProjectRouting(services: VisualizeServices) {
  const [projectRoutingManager, setProjectRoutingManager] = useState<
    ProjectRoutingManager | undefined
  >();

  useEffect(() => {
    const cpsManager = services.cps?.cpsManager;
    if (!cpsManager) {
      return;
    }

    const initialProjectRouting = cpsManager.getProjectRouting();
    const projectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(initialProjectRouting);

    // Subscribe to CPS's projectRouting$ to sync changes from the project picker
    const cpsProjectRoutingSubscription = cpsManager
      .getProjectRouting$()
      ?.subscribe((cpsProjectRouting: ProjectRouting | undefined) => {
        if (cpsProjectRouting !== projectRouting$.value) {
          projectRouting$.next(cpsProjectRouting);
        }
      });

    const manager: ProjectRoutingManager = {
      getProjectRouting: () => projectRouting$.value ?? cpsManager.getProjectRouting(),
      getProjectRouting$: () => projectRouting$.asObservable(),
    };

    setProjectRoutingManager(manager);

    return () => {
      cpsProjectRoutingSubscription?.unsubscribe();
      projectRouting$.complete();
    };
  }, [services.cps?.cpsManager]);

  return projectRoutingManager;
}
