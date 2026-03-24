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
import { useHistory } from 'react-router-dom';
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
  const pathname = useHistory().location.pathname;
  const currentAppId = useObservable(application.currentAppId$);
  const cpsManager = cps?.cpsManager;

  useEffect(() => {
    if (!currentAppId || !cpsManager) {
      return;
    }
    cpsManager.registerAppAccess(currentAppId, (location) => {
      if (pathname.length > 0 && location.endsWith(pathname)) {
        return access;
      }
      return ProjectRoutingAccess.DISABLED;
    });

    return () => {
      cpsManager.registerAppAccess(currentAppId, () => ProjectRoutingAccess.DISABLED);
    };
  }, [access, cpsManager, currentAppId, pathname]);
};
