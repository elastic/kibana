/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useMemo } from 'react';
import { DiscoverProfilesProvider, useDiscoverProfiles } from './profiles_provider';
import { DiscoverProfileRegistry } from './profile_registry';
import {
  DiscoverRootContext,
  DiscoverRootContextProvider,
  useDiscoverRootContext,
} from './root_context';
import { DiscoverRuntimeContextProvider, useDiscoverRuntimeContext } from './runtime_context';

export interface DiscoverContextProviderProps {
  rootContext: DiscoverRootContext;
  profileRegistry: DiscoverProfileRegistry;
}

export const DiscoverContextProvider: FC<DiscoverContextProviderProps> = ({
  children,
  rootContext,
  profileRegistry,
}) => {
  return (
    <DiscoverRootContextProvider value={rootContext}>
      <DiscoverProfilesProvider value={profileRegistry}>
        <DiscoverRuntimeContextProvider>{children}</DiscoverRuntimeContextProvider>
      </DiscoverProfilesProvider>
    </DiscoverRootContextProvider>
  );
};

export const useDiscoverContext = () => {
  const rootContext = useDiscoverRootContext();
  const profiles = useDiscoverProfiles();
  const runtimeContext = useDiscoverRuntimeContext();

  return useMemo(
    () => ({ rootContext, ...profiles, runtimeContext }),
    [profiles, rootContext, runtimeContext]
  );
};
