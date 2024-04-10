/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { combineReducers } from '@reduxjs/toolkit';
import { Provider as ReduxProvider } from 'react-redux';
import { useStore } from '../store';
import { useAuthorizedConsumers } from '../hooks';
import type { RuleFormAppContext, RuleFormRule } from '../types';
import { useRuleType } from './rule_type_context';
import { useInitialRule } from './initial_rule_context';
import { ruleDefinitionSlice, ruleDetailsSlice } from '../features';
import { hydrateState } from '../common/constants';

interface ReduxStoreProviderProps {
  appContext: RuleFormAppContext;
}

const initialRuleToInitialState = (initialRule: RuleFormRule) => {
  // Call combineReducers inside a function to avoid Webpack import order problems
  const initialStateReducer = combineReducers({
    ruleDefinition: ruleDefinitionSlice.reducer,
    ruleDetails: ruleDetailsSlice.reducer,
  });

  return initialStateReducer(undefined, hydrateState(initialRule));
};

export const ReduxStoreProvider: React.FC<ReduxStoreProviderProps> = ({
  appContext: { consumer, validConsumers },
  children,
}) => {
  const ruleTypeModel = useRuleType();
  const initialRule = useInitialRule();

  const initialState = useMemo(
    () =>
      initialRule
        ? initialRuleToInitialState(initialRule)
        : {
            ruleDetails: { name: `${ruleTypeModel.name} rule`, tags: [] },
            ruleDefinition: { consumer, params: ruleTypeModel.defaultRuleParams ?? {} },
          },
    [ruleTypeModel, consumer, initialRule]
  );

  const authorizedConsumers = useAuthorizedConsumers(ruleTypeModel, validConsumers);

  const store = useStore(initialState, authorizedConsumers);

  return <ReduxProvider store={store}>{children}</ReduxProvider>;
};
