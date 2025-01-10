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

export const useDefaultAdHocDataViews = ({
  stateContainer,
  rootProfileState,
}: {
  stateContainer: DiscoverStateContainer;
  rootProfileState: RootProfileState;
}) => {
  const { dataViews } = useDiscoverServices();
  const [prevProfileDataViewIds, setPrevProfileDataViewIds] = useState<string[]>([]);

  const initializeDataViews = useLatest(async () => {
    if (rootProfileState.rootProfileLoading) {
      return;
    }

    const profileDataViewSpecs = rootProfileState.getDefaultAdHocDataViews();
    const profileDataViews = await Promise.all(
      profileDataViewSpecs.map((spec) => dataViews.create(spec, true))
    );
    const currentDataViews = stateContainer.internalState.getState().adHocDataViews;
    const newDataViews = currentDataViews
      .filter((dataView) => !prevProfileDataViewIds.includes(dataView.id!))
      .concat(profileDataViews);

    for (const prevId of prevProfileDataViewIds) {
      dataViews.clearInstanceCache(prevId);
    }

    setPrevProfileDataViewIds(profileDataViews.map((dataView) => dataView.id!));
    stateContainer.internalState.transitions.setAdHocDataViews(newDataViews);
  });

  // This approach allows us to return a callback with a stable reference
  const [initializeProfileDataViews] = useState(() => () => initializeDataViews.current());

  // Make sure to clean up on unmount
  useUnmount(() => {
    for (const prevId of prevProfileDataViewIds) {
      dataViews.clearInstanceCache(prevId);
    }
  });

  return { initializeProfileDataViews };
};
