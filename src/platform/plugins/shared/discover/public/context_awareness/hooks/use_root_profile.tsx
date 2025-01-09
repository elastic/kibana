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
import useLatest from 'react-use/lib/useLatest';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { Profile } from '../types';
import type { ResolveRootProfileResult } from '../profiles_manager';

/**
 * Hook to trigger and wait for root profile resolution
 * @param options Options object
 * @returns The root profile state
 */
export const useRootProfile = ({
  onRootProfileResolved: originalOnRootProfileResolved,
}: {
  onRootProfileResolved?: (
    result: Pick<ResolveRootProfileResult, 'getDefaultAdHocDataViews'>
  ) => unknown;
} = {}) => {
  const { profilesManager, core } = useDiscoverServices();
  const onRootProfileResolved = useLatest(originalOnRootProfileResolved);
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
        switchMap(async (id) => {
          const result = await profilesManager.resolveRootProfile({ solutionNavId: id });
          await onRootProfileResolved.current?.(result);
          return result;
        }),
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
  }, [core.chrome, onRootProfileResolved, profilesManager]);

  return rootProfileState;
};

export const BaseAppWrapper: Profile['getRenderAppWrapper'] = ({ children }) => <>{children}</>;
