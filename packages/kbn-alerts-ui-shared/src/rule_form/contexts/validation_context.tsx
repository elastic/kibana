/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { ValidationStatus } from '../common/constants';
import {
  RuleDefinitionValidation,
  RuleDetailsValidation,
  useValidateRuleDefinition,
  useValidateRuleDetails,
} from '../features';
import { RuleFormStateValidation } from '../types';
import { useConfig } from './config_context';
import { useRuleType } from './rule_type_context';

const ValidationContext = createContext<RuleFormStateValidation>({
  ruleDefinition: {
    errors: {
      params: {},
      consumer: [],
      schedule: { interval: [] },
      alertDelay: [],
    },
    status: ValidationStatus.INCOMPLETE,
  },
  ruleDetails: {
    errors: {
      name: [],
      tags: [],
    },
    status: ValidationStatus.COMPLETE,
  },
  isOverallValid: false,
});

export const ValidationProvider: React.FC = ({ children }) => {
  const config = useConfig();
  const ruleTypeModel = useRuleType();
  const ruleDefinitionValidation: RuleDefinitionValidation = useValidateRuleDefinition({
    config,
    ruleTypeModel,
  });
  const ruleDetailsValidation: RuleDetailsValidation = useValidateRuleDetails();

  const validationStatus = {
    ruleDefinition: ruleDefinitionValidation,
    ruleDetails: ruleDetailsValidation,
    isOverallValid: useMemo(
      () =>
        [ruleDefinitionValidation, ruleDetailsValidation].every(
          ({ status }) => status === ValidationStatus.COMPLETE
        ),
      [ruleDefinitionValidation, ruleDetailsValidation]
    ),
  };
  return (
    <ValidationContext.Provider value={validationStatus}>{children}</ValidationContext.Provider>
  );
};
export const useValidation = () => useContext(ValidationContext);
