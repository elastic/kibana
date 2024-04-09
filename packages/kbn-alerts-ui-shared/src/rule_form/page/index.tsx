/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { RuleFormPage } from './rule_form_page';
import type { RuleFormPageProps } from './rule_form_page';
import { ContextsProvider } from '../contexts';
import {
  RuleFormAppContext,
  RuleFormConfig,
  RuleFormKibanaServices,
  RuleTypeModelFromRegistry,
} from '../types';

interface EditRuleFormPageComponentProps {
  isEdit: true;
  ruleId: string;
  isRuleTypeModelPending: boolean;
  onLoadRuleSuccess: (ruleTypeId: string, ruleName: string) => void;
}

interface CreateRuleFormPageComponentProps {
  isEdit?: false | undefined;
  isRuleTypeModelPending?: never;
  onLoadRuleSuccess?: never;
  ruleId?: never;
}

type RuleFormModeDependentProps = EditRuleFormPageComponentProps | CreateRuleFormPageComponentProps;

interface RuleFormPageComponentProps extends RuleFormPageProps, RuleFormKibanaServices {
  config?: RuleFormConfig;
  appContext: RuleFormAppContext;
  registeredRuleTypeModel: RuleTypeModelFromRegistry | null;
}

export const RuleFormPageComponent: React.FC<
  RuleFormPageComponentProps & RuleFormModeDependentProps
> = ({
  http,
  toasts,
  config,
  appContext: { consumer, validConsumers, canShowConsumerSelection },
  registeredRuleTypeModel,
  isRuleTypeModelPending = false,
  onLoadRuleSuccess = () => {}, // Not needed for Create, only for Edit
  isEdit,
  ruleId,
  ...rest
}) => {
  return (
    <ContextsProvider
      onLoadRuleSuccess={onLoadRuleSuccess}
      registeredRuleTypeModel={registeredRuleTypeModel}
      isRuleTypeModelPending={isRuleTypeModelPending}
      appContext={{ consumer, validConsumers }}
      http={http}
      toasts={toasts}
      isEdit={isEdit}
      ruleId={ruleId}
    >
      <RuleFormPage
        canShowConsumerSelection={canShowConsumerSelection}
        validConsumers={validConsumers}
        isEdit={isEdit}
        {...rest}
      />
    </ContextsProvider>
  );
};
