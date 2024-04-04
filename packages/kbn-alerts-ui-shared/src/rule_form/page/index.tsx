/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { Provider } from 'react-redux';
import { RuleFormPage } from './rule_form_page';
import { useStore } from '../store';
import type { RuleFormPageProps } from './rule_form_page';
import {
  ConfigProvider,
  ValidationProvider,
  useAuthorizedConsumers,
  DEFAULT_CONFIG,
} from '../hooks';
import { RuleFormAppContext, RuleFormConfig } from '../types';

interface RuleFormPageComponentProps extends RuleFormPageProps {
  config?: RuleFormConfig;
  appContext: RuleFormAppContext;
}

export const RuleFormPageComponent: React.FC<RuleFormPageComponentProps> = ({
  ruleTypeModel,
  config = DEFAULT_CONFIG,
  appContext: { consumer, validConsumers, canShowConsumerSelection },
  ...rest
}) => {
  const initialState = useMemo(
    () => ({
      ruleDetails: { name: `${ruleTypeModel.name} rule`, tags: [] },
      ruleDefinition: { consumer },
    }),
    [ruleTypeModel.name, consumer]
  );

  const authorizedConsumers = useAuthorizedConsumers(ruleTypeModel, validConsumers);

  const store = useStore(initialState, authorizedConsumers);

  return (
    <Provider store={store}>
      <ConfigProvider value={config}>
        <ValidationProvider ruleTypeModel={ruleTypeModel}>
          <RuleFormPage
            ruleTypeModel={ruleTypeModel}
            canShowConsumerSelection={canShowConsumerSelection}
            authorizedConsumers={authorizedConsumers}
            {...rest}
          />
        </ValidationProvider>
      </ConfigProvider>
    </Provider>
  );
};
