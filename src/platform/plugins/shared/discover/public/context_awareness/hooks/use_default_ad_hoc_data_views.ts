/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState } from 'react';
import useLatest from 'react-use/lib/useLatest';
import useUnmount from 'react-use/lib/useUnmount';
import type { RootProfileState } from './use_root_profile';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { DiscoverStateContainer } from '../../application/main/state_management/discover_state';

/**
 * Hook to retrieve and initialize the default profile ad hoc data views
 * @param Options The options object
 * @returns An object containing the initialization function
 */
export const useDefaultAdHocDataViews = ({
  stateContainer,
  rootProfileState,
}: {
  stateContainer: DiscoverStateContainer;
  rootProfileState: RootProfileState;
}) => {
  const { dataViews } = useDiscoverServices();
  const { internalState } = stateContainer;

  const initializeDataViews = useLatest(async () => {
    if (rootProfileState.rootProfileLoading) {
      return;
    }

    // Clear the cache of old data views before creating
    // the new ones to avoid cache hits on duplicate IDs
    for (const prevId of internalState.get().defaultProfileAdHocDataViewIds) {
      dataViews.clearInstanceCache(prevId);
    }

    const profileDataViewSpecs = rootProfileState.getDefaultAdHocDataViews();
    const profileDataViews = await Promise.all(
      profileDataViewSpecs.map((spec) => dataViews.create(spec, true))
    );

    internalState.transitions.setDefaultProfileAdHocDataViews(profileDataViews);
  });

  // This approach allows us to return a callback with a stable reference
  const [initializeProfileDataViews] = useState(() => () => initializeDataViews.current());

  // Make sure to clean up on unmount
  useUnmount(() => {
    for (const prevId of internalState.get().defaultProfileAdHocDataViewIds) {
      dataViews.clearInstanceCache(prevId);
    }

    internalState.transitions.setDefaultProfileAdHocDataViews([]);
  });

  return { initializeProfileDataViews };
};
