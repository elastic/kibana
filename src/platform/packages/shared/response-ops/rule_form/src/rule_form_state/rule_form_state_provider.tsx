/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useReducer, useRef, useEffect } from 'react';
import { isEqual } from 'lodash';
import { RuleFormState } from '../types';
import { RuleFormStateContext, RuleFormReducerContext } from './rule_form_state_context';
import { ruleFormStateReducer } from './rule_form_state_reducer';
import { validateRuleBase, validateRuleParams } from '../validation';

export interface RuleFormStateProviderProps {
  initialRuleFormState: RuleFormState;
  isFlyout?: boolean;
}

export const RuleFormStateProvider: React.FC<
  React.PropsWithChildren<RuleFormStateProviderProps>
> = (props) => {
  const { children, initialRuleFormState, isFlyout } = props;
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

  // Rule form state `touched` tends to get reset improperly in the flyout when the screen is re-rendered,
  // so track it based on the first returned value of the form data
  const originalFormData = useRef<RuleFormState['formData']>();
  useEffect(() => {
    if (!isFlyout) return;
    if (!originalFormData.current && ruleFormState.formData && ruleFormState.touched === false) {
      originalFormData.current = ruleFormState.formData;
    }
  }, [ruleFormState.formData, ruleFormState.touched, isFlyout]);

  const touched = isFlyout
    ? ruleFormState.touched
    : Boolean(
        ruleFormState.touched ||
          (originalFormData.current && !isEqual(originalFormData.current, ruleFormState.formData))
      );
  return (
    <RuleFormStateContext.Provider value={{ ...ruleFormState, touched }}>
      <RuleFormReducerContext.Provider value={dispatch}>{children}</RuleFormReducerContext.Provider>
    </RuleFormStateContext.Provider>
  );
};
