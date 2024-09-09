/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState } from 'react';
import {
  DiscoverStateContainer,
  getDiscoverStateContainer,
  DiscoverStateContainerParams,
} from '../state_management/discover_state';

/**
 * Creates a state container using the initial params and allows to reset it.
 * The container is recreated only when reset is called. This is useful to reset Discover to its initial state.
 * @param params
 */
export const useDiscoverStateContainer = (params: DiscoverStateContainerParams) => {
  const [stateContainer, setStateContainer] = useState<DiscoverStateContainer>(() =>
    getDiscoverStateContainer(params)
  );

  return [
    stateContainer,
    {
      reset: () => {
        setStateContainer(getDiscoverStateContainer(params));
      },
    },
  ] as const;
};
