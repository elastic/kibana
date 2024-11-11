/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { distinctUntilChanged, filter, switchMap, tap } from 'rxjs';
import React from 'react';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { Profile } from '../types';

/**
 * Hook to trigger and wait for root profile resolution
 * @param options Options object
 * @returns If the root profile is loading
 */
export const useRootProfile = () => {
  const { profilesManager, core } = useDiscoverServices();
  const [rootProfileState, setRootProfileState] = useState<
    | { rootProfileLoading: true }
    | { rootProfileLoading: false; AppWrapper: Profile['getRenderAppWrapper'] }
  >({ rootProfileLoading: true });

  useEffect(() => {
    const subscription = core.chrome
      .getActiveSolutionNavId$()
      .pipe(
        distinctUntilChanged(),
        filter((id) => id !== undefined),
        tap(() => setRootProfileState({ rootProfileLoading: true })),
        switchMap((id) => profilesManager.resolveRootProfile({ solutionNavId: id })),
        tap(({ getRenderAppWrapper }) =>
          setRootProfileState({
            rootProfileLoading: false,
            AppWrapper: getRenderAppWrapper?.(BaseAppWrapper) ?? BaseAppWrapper,
          })
        )
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [core.chrome, profilesManager]);

  return rootProfileState;
};

export const BaseAppWrapper: Profile['getRenderAppWrapper'] = ({ children }) => <>{children}</>;
