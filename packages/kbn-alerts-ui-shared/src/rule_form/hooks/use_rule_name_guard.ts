/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useRef } from 'react';
import { useRuleFormDispatch } from './use_rule_form_dispatch';
import { useRuleFormSelector } from './use_rule_form_selector';
import { setRuleName } from '../features/rule_details/slice';

export const useRuleNameGuard = () => {
  const currentName = useRuleFormSelector((state) => state.ruleDetails.name);
  const dispatch = useRuleFormDispatch();

  const initialName = useRef(currentName);

  return {
    onRuleNameFocus: () => {
      initialName.current = currentName;
    },
    onRuleNameBlur: () => {
      if (!currentName) {
        dispatch(setRuleName(initialName.current));
      }
    },
  };
};
