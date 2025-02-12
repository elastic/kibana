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
 * The root profile state
 */
export type RootProfileState =
  | { rootProfileLoading: true }
  | {
      rootProfileLoading: false;
      AppWrapper: Profile['getRenderAppWrapper'];
      getDefaultAdHocDataViews: Profile['getDefaultAdHocDataViews'];
    };

/**
 * Hook to trigger and wait for root profile resolution
 * @param options Options object
 * @returns The root profile state
 */
export const useRootProfile = () => {
  const { profilesManager, core } = useDiscoverServices();
  const [rootProfileState, setRootProfileState] = useState<RootProfileState>({
    rootProfileLoading: true,
  });

  useEffect(() => {
    const subscription = core.chrome
      .getActiveSolutionNavId$()
      .pipe(
        distinctUntilChanged(),
        filter((id) => id !== undefined),
        tap(() => setRootProfileState({ rootProfileLoading: true })),
        switchMap((solutionNavId) => profilesManager.resolveRootProfile({ solutionNavId })),
        tap(({ getRenderAppWrapper, getDefaultAdHocDataViews }) =>
          setRootProfileState({
            rootProfileLoading: false,
            AppWrapper: getRenderAppWrapper?.(BaseAppWrapper) ?? BaseAppWrapper,
            getDefaultAdHocDataViews:
              getDefaultAdHocDataViews?.(baseGetDefaultAdHocDataViews) ??
              baseGetDefaultAdHocDataViews,
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

const baseGetDefaultAdHocDataViews: Profile['getDefaultAdHocDataViews'] = () => [];
