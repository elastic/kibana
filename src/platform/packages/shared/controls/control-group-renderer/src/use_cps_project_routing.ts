/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';

import type { CPSPluginStart } from '@kbn/cps/public';
import type { ProjectRouting } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { PublishesProjectRouting } from '@kbn/presentation-publishing';

/**
 * Publishes the current Cross-Project Search (CPS) routing on the control group's parent API so
 * that data controls (e.g. options list suggestions) query the projects selected in the CPS
 * project picker instead of the origin project only.
 *
 * Returns `undefined` when CPS is unavailable so the control group behaves exactly as before in
 * non-CPS environments.
 */
export const useCpsProjectRoutingApi = (): PublishesProjectRouting | undefined => {
  const {
    services: { cps },
  } = useKibana<{ cps?: CPSPluginStart }>();
  const cpsManager = cps?.cpsManager;

  const projectRoutingApi = useMemo(() => {
    if (!cpsManager) return undefined;
    return {
      projectRouting$: new BehaviorSubject<ProjectRouting | undefined>(
        cpsManager.getProjectRouting()
      ),
    };
  }, [cpsManager]);

  useEffect(() => {
    if (!cpsManager || !projectRoutingApi) return;

    const { projectRouting$ } = projectRoutingApi;
    const subscription = cpsManager.getProjectRouting$().subscribe((projectRouting) => {
      if (projectRouting !== projectRouting$.getValue()) {
        projectRouting$.next(projectRouting);
      }
    });

    return () => subscription.unsubscribe();
  }, [cpsManager, projectRoutingApi]);

  return projectRoutingApi;
};
