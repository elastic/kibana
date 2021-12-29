/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useContext } from 'react';
import { createAppContext } from '../../../utils/app_state_context';
import { ContextAppState, ContextGetStateReturn } from '../services/context_state';

export const ContextViewContext = createAppContext<ContextAppState, ContextGetStateReturn>({
  state: {} as ContextAppState,
  stateContainer: {} as ContextGetStateReturn,
});

export const useContextViewContext = () => {
  return useContext(ContextViewContext);
};
