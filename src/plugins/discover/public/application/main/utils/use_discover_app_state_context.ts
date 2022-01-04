/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useContext } from 'react';
import { createAppContext } from '../../../utils/app_state_context';
import type { DiscoverAppState, DiscoverGetStateReturn } from '../services/discover_state';

export const DiscoverAppStateContext = createAppContext<DiscoverAppState, DiscoverGetStateReturn>({
  state: {},
  stateContainer: {} as DiscoverGetStateReturn,
});

export const useDiscoverAppStateContext = () => useContext(DiscoverAppStateContext);
