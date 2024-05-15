/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import type { RuleTypeWithDescription } from '../common/types';
import type {
  RuleFormPlugins,
  RuleFormSchema,
  MinimumScheduleInterval,
  RuleFormErrors,
  RuleTypeModel,
} from './types';

import { RuleFormStateProvider } from './rule_form_state';

import { RulePage } from './rule_page';

export interface RuleFormProps {
  plugins: RuleFormPlugins;
  state: RuleFormSchema;
  minimumScheduleInterval?: MinimumScheduleInterval;
  errors?: RuleFormErrors;
  canShowConsumerSelection?: boolean;
  authorizedConsumers?: RuleCreationValidConsumer[];
  selectedRuleTypeModel: RuleTypeModel;
  selectedRuleType: RuleTypeWithDescription;
  validConsumers?: RuleCreationValidConsumer[];
  metadata?: Record<string, unknown>;
}

export const RuleForm = (props: RuleFormProps) => {
  const {
    plugins,
    state,
    minimumScheduleInterval,
    errors = {},
    canShowConsumerSelection,
    authorizedConsumers,
    selectedRuleTypeModel,
    selectedRuleType,
    validConsumers,
    metadata,
  } = props;

  return (
    <RuleFormStateProvider
      initialRuleFormState={{
        state,
        plugins,
        minimumScheduleInterval,
        errors,
        metadata,
      }}
    >
      <RulePage
        canShowConsumerSelection={canShowConsumerSelection}
        authorizedConsumers={authorizedConsumers}
        selectedRuleTypeModel={selectedRuleTypeModel}
        selectedRuleType={selectedRuleType}
        validConsumers={validConsumers}
      />
    </RuleFormStateProvider>
  );
};
