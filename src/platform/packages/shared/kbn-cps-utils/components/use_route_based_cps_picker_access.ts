/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useHistory } from 'react-router-dom';
import { useCallback } from 'react';
import type { Observable } from 'rxjs';
import type { ICPSManager } from '../types';
import { ProjectRoutingAccess } from '../types';
import { useCpsPickerAccess } from './use_cps_picker_access';

interface ApplicationService {
  currentAppId$: Observable<string | undefined>;
}

interface CpsService {
  cpsManager?: ICPSManager;
}

export const useRouteBasedCpsPickerAccess = (
  access: ProjectRoutingAccess,
  { application, cps }: { application: ApplicationService; cps?: CpsService }
) => {
  const pathname = useHistory().location.pathname;

  const resolver = useCallback(
    (location: string) => {
      if (pathname.length > 0 && location.endsWith(pathname)) {
        return access;
      }
      return ProjectRoutingAccess.DISABLED;
    },
    [access, pathname]
  );

  useCpsPickerAccess({
    resolver,
    currentAppId$: application.currentAppId$,
    cpsManager: cps?.cpsManager,
  });
};
