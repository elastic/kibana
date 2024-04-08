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
import {
  ruleDetailsReducer,
  ruleDefinitionReducer,
  initializeAndValidateConsumer,
} from '../features';
import { metaReducer } from './metaSlice';

const rootReducer = combineReducers({
  ruleDefinition: ruleDefinitionReducer,
  ruleDetails: ruleDetailsReducer,
  meta: metaReducer,
});

const initializeStore = (
  partialInitialState: {
    [K in keyof RuleFormRootState]?: Partial<RuleFormRootState[K]>;
  },
  validConsumers?: RuleCreationValidConsumer[]
) => {
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
  store.dispatch(initializeAndValidateConsumer(validConsumers));
  return store;
};

export const useStore = (...args: Parameters<typeof initializeStore>) =>
  useRef(initializeStore(...args)).current;

export type RuleFormRootState = ReturnType<typeof rootReducer>;
export type RuleFormDispatch = ReturnType<typeof initializeStore>['dispatch'];
