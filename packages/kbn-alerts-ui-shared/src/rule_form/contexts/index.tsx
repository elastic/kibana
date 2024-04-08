/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { ConfigProvider, DEFAULT_CONFIG } from './config_context';
import { KibanaServicesProvider } from './kibana_services_context';
import { RuleTypeProvider } from './rule_type_context';
import { ValidationProvider } from './validation_context';
import { ReduxStoreProvider } from './redux_store_provider';
import {
  RuleFormAppContext,
  RuleFormConfig,
  RuleTypeModelFromRegistry,
  RuleFormKibanaServices,
} from '../types';

export { useRuleType } from './rule_type_context';
export { useConfig } from './config_context';
export { useValidation } from './validation_context';
export { useKibanaServices } from './kibana_services_context';

interface ContextsProviderProps extends RuleFormKibanaServices {
  config?: RuleFormConfig;
  appContext: RuleFormAppContext;
  registeredRuleTypeModel: RuleTypeModelFromRegistry;
}

export const ContextsProvider: React.FC<ContextsProviderProps> = ({
  children,
  config = DEFAULT_CONFIG,
  http,
  toasts,
  registeredRuleTypeModel,
  appContext,
}) => {
  return (
    <KibanaServicesProvider value={{ http, toasts }}>
      <RuleTypeProvider registeredRuleTypeModel={registeredRuleTypeModel}>
        <ConfigProvider value={config}>
          {/**  ReduxStoreProvider requires the rule type to initialize
           * RuleTypeProvider does not render children if it fails to load the rule type,
           * so the Redux store MUST be a child of the RuleTypeProvider
           */}
          <ReduxStoreProvider appContext={appContext}>
            <ValidationProvider>{children}</ValidationProvider>
          </ReduxStoreProvider>
        </ConfigProvider>
      </RuleTypeProvider>
    </KibanaServicesProvider>
  );
};
