/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useRouteMatch } from 'react-router-dom';
import type { Observable } from 'rxjs';
import type { ICPSManager } from '../types';
import { ProjectRoutingAccess } from '../types';

interface ApplicationService {
  currentAppId$: Observable<string | undefined>;
}

interface CpsService {
  cpsManager?: ICPSManager;
}

/**
 * Set the CPS global project picker access state only for the current matching route.
 * Pass `application` and `cps` from your plugin's `useKibana().services`.
 */
export const useCpsPickerAccess = (
  access: ProjectRoutingAccess,
  { application, cps }: { application: ApplicationService; cps: CpsService | undefined }
) => {
  const routeMatch = useRouteMatch();
  const currentAppId = useObservable(application.currentAppId$);

  useEffect(() => {
    if (!currentAppId || !cps?.cpsManager) {
      return;
    }
    cps.cpsManager.registerAppAccess(currentAppId, (location) => {
      if (location.endsWith(routeMatch.url)) {
        return access;
      }
      return ProjectRoutingAccess.DISABLED;
    });

    return () => {
      cps?.cpsManager?.registerAppAccess(currentAppId, () => ProjectRoutingAccess.DISABLED);
    };
  }, [access, cps, currentAppId, routeMatch]);
};
