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

interface RuleFormPageComponentProps extends RuleFormPageProps, RuleFormKibanaServices {
  config?: RuleFormConfig;
  appContext: RuleFormAppContext;
  registeredRuleTypeModel: RuleTypeModelFromRegistry;
}

export const RuleFormPageComponent: React.FC<RuleFormPageComponentProps> = ({
  http,
  toasts,
  config,
  appContext: { consumer, validConsumers, canShowConsumerSelection },
  registeredRuleTypeModel,
  ...rest
}) => {
  return (
    <ContextsProvider
      registeredRuleTypeModel={registeredRuleTypeModel}
      appContext={{ consumer, validConsumers }}
      http={http}
      toasts={toasts}
    >
      <RuleFormPage
        canShowConsumerSelection={canShowConsumerSelection}
        validConsumers={validConsumers}
        {...rest}
      />
    </ContextsProvider>
  );
};
