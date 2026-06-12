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
import type { Observable } from 'rxjs';
import type { ICPSManager, CPSAppAccessResolver } from '../types';
import { ProjectRoutingAccess } from '../types';

interface UseCpsPickerAccessParams {
  /** The access resolver function - called to determine access for a given location */
  resolver: CPSAppAccessResolver;
  /** Observable of the current app ID */
  currentAppId$: Observable<string | undefined>;
  /** The CPS manager instance (may be undefined if CPS is disabled) */
  cpsManager?: ICPSManager;
}

const cleanupResolver = () => ProjectRoutingAccess.DISABLED;

/**
 * Registers a CPS picker access resolver for the current app.
 * Automatically cleans up (sets DISABLED) on unmount.
 *
 * Consumers are responsible for providing their own resolver logic
 * based on their routing patterns.
 *
 * NOTE: Call this hook only once per rendered page (at the top-level page component).
 * Calling it in nested sub-routes or sub-components risks the cleanup of an inner instance
 * overwriting the CPS state set by an outer one.
 */
export const useCpsPickerAccess = ({
  resolver,
  currentAppId$,
  cpsManager,
}: UseCpsPickerAccessParams) => {
  const currentAppId = useObservable(currentAppId$);

  useEffect(() => {
    if (!currentAppId || !cpsManager) {
      return;
    }

    cpsManager.registerAppAccess(currentAppId, resolver);

    return () => {
      cpsManager.registerAppAccess(currentAppId, cleanupResolver);
    };
  }, [resolver, cpsManager, currentAppId]);
};
