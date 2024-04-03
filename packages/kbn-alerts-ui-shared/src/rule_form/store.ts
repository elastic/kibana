/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { ruleDetailsReducer } from './features/rule_details/slice';
import { ruleDefinitionReducer } from './features/rule_definition/slice';

const rootReducer = combineReducers({
  ruleDefinition: ruleDefinitionReducer,
  ruleDetails: ruleDetailsReducer,
});

export const initializeStore = (preloadedState: RuleFormRootState) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
  });

export type RuleFormRootState = ReturnType<typeof rootReducer>;
export type RuleFormDispatch = ReturnType<typeof initializeStore>['dispatch'];
