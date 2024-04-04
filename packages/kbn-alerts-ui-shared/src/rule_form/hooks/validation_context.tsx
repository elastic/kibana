/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext } from 'react';
import { ValidationStatus } from '../common/constants';
import {
  RuleDefinitionValidation,
  RuleDetailsValidation,
  useValidateRuleDefinition,
  useValidateRuleDetails,
} from '../features';
import { RuleFormStateValidation, RuleTypeModel } from '../types';
import { useConfigContext } from './config_context';

const ValidationContext = createContext<RuleFormStateValidation>({
  ruleDefinition: {
    errors: {
      params: {},
      consumer: [],
      schedule: { interval: [] },
      alertDelay: [],
    },
    status: ValidationStatus.COMPLETE,
  },
  ruleDetails: {
    errors: {
      name: [],
      tags: [],
    },
    status: ValidationStatus.COMPLETE,
  },
});

export const ValidationProvider: React.FC<{
  ruleTypeModel: RuleTypeModel;
}> = ({ ruleTypeModel, children }) => {
  const config = useConfigContext();
  const ruleDefinitionValidation: RuleDefinitionValidation = useValidateRuleDefinition({
    config,
    ruleTypeModel,
  });
  const ruleDetailsValidation: RuleDetailsValidation = useValidateRuleDetails();

  const validationStatus = {
    ruleDefinition: ruleDefinitionValidation,
    ruleDetails: ruleDetailsValidation,
  };
  return (
    <ValidationContext.Provider value={validationStatus}>{children}</ValidationContext.Provider>
  );
};
export const useValidationContext = () => useContext(ValidationContext);
