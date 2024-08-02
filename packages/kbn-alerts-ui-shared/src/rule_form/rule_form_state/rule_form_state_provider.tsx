/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useReducer } from 'react';
import { RuleFormState } from '../types';
import { RuleFormStateContext, RuleFormReducerContext } from './rule_form_state_context';
import { ruleFormStateReducer } from './rule_form_state_reducer';
import { validateRuleBase, validateRuleParams } from '../validation';

export interface RuleFormStateProviderProps {
  initialRuleFormState: RuleFormState;
}

export const RuleFormStateProvider: React.FC<RuleFormStateProviderProps> = (props) => {
  const { children, initialRuleFormState } = props;
  const {
    formData,
    selectedRuleTypeModel: ruleTypeModel,
    minimumScheduleInterval,
  } = initialRuleFormState;

  const [ruleFormState, dispatch] = useReducer(ruleFormStateReducer, {
    ...initialRuleFormState,
    baseErrors: validateRuleBase({
      formData,
      minimumScheduleInterval,
    }),
    paramsErrors: validateRuleParams({
      formData,
      ruleTypeModel,
    }),
  });
  return (
    <RuleFormStateContext.Provider value={ruleFormState}>
      <RuleFormReducerContext.Provider value={dispatch}>{children}</RuleFormReducerContext.Provider>
    </RuleFormStateContext.Provider>
  );
};
