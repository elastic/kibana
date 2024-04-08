/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useRef } from 'react';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { ruleDetailsSlice, ruleDefinitionSlice, initializeAndValidateConsumer } from '../features';
import { metaSlice } from './meta_slice';

const initializeStore = (
  partialInitialState: {
    [K in keyof RuleFormRootState]?: Partial<RuleFormRootState[K]>;
  },
  authorizedConsumers?: RuleCreationValidConsumer[]
) => {
  const rootReducer = combineReducers({
    ruleDefinition: ruleDefinitionSlice.reducer,
    ruleDetails: ruleDetailsSlice.reducer,
    meta: metaSlice.reducer,
  });
  const preloadedState: RuleFormRootState = rootReducer(undefined, { type: 'INIT' });
  if (partialInitialState.ruleDefinition) {
    preloadedState.ruleDefinition = {
      ...preloadedState.ruleDefinition,
      ...partialInitialState.ruleDefinition,
    };
  }
  if (partialInitialState.ruleDetails) {
    preloadedState.ruleDetails = {
      ...preloadedState.ruleDetails,
      ...partialInitialState.ruleDetails,
    };
  }

  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
  });
  // Dispatch an initial action for reducers to correct the preloadedState
  store.dispatch(initializeAndValidateConsumer(authorizedConsumers));
  return store;
};

export const useStore = (...args: Parameters<typeof initializeStore>) =>
  useRef(initializeStore(...args)).current;

export interface RuleFormRootState {
  ruleDefinition: ReturnType<typeof ruleDefinitionSlice.reducer>;
  ruleDetails: ReturnType<typeof ruleDetailsSlice.reducer>;
  meta: ReturnType<typeof metaSlice.reducer>;
}
export type RuleFormDispatch = ReturnType<typeof initializeStore>['dispatch'];
