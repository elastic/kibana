/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { useStore } from '../store';
import { useAuthorizedConsumers } from '../hooks';
import type { RuleFormAppContext } from '../types';
import { useRuleType } from './rule_type_context';

interface ReduxStoreProviderProps {
  appContext: RuleFormAppContext;
}

export const ReduxStoreProvider: React.FC<ReduxStoreProviderProps> = ({
  appContext: { consumer, validConsumers },
  children,
}) => {
  const ruleTypeModel = useRuleType();
  const initialState = useMemo(
    () => ({
      ruleDetails: { name: `${ruleTypeModel.name} rule`, tags: [] },
      ruleDefinition: { consumer },
    }),
    [ruleTypeModel.name, consumer]
  );

  const authorizedConsumers = useAuthorizedConsumers(ruleTypeModel, validConsumers);

  const store = useStore(initialState, authorizedConsumers);

  return <ReduxProvider store={store}>{children}</ReduxProvider>;
};
