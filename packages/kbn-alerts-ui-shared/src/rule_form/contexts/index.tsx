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
import { InitialRuleProvider, type OnLoadRuleSuccess } from './initial_rule_context';

export { useRuleType } from './rule_type_context';
export { useConfig } from './config_context';
export { useValidation } from './validation_context';
export { useKibanaServices } from './kibana_services_context';

interface ContextsProviderProps extends RuleFormKibanaServices {
  config?: RuleFormConfig;
  appContext: RuleFormAppContext;
  registeredRuleTypeModel: RuleTypeModelFromRegistry | null;
  onLoadRuleSuccess: OnLoadRuleSuccess;
  isRuleTypeModelPending: boolean;
  isEdit?: boolean;
  ruleId?: string;
}

export const ContextsProvider: React.FC<ContextsProviderProps> = ({
  children,
  config = DEFAULT_CONFIG,
  http,
  toasts,
  registeredRuleTypeModel,
  isRuleTypeModelPending,
  appContext,
  isEdit,
  onLoadRuleSuccess,
  ruleId = '',
}) => {
  return (
    <KibanaServicesProvider value={{ http, toasts }}>
      <InitialRuleProvider isEdit={isEdit} ruleId={ruleId} onLoadRuleSuccess={onLoadRuleSuccess}>
        <RuleTypeProvider
          registeredRuleTypeModel={registeredRuleTypeModel}
          isRuleTypeModelPending={isRuleTypeModelPending}
        >
          <ConfigProvider value={config}>
            {/**  ReduxStoreProvider requires the rule type and initial rule to initialize
             * RuleTypeProvider does not render children if it fails to load the rule type,
             * or if it fails to load the initial rule in Edit mode, so the Redux store MUST
             * be a child of the RuleTypeProvider and InitialRuleProvider
             */}
            <ReduxStoreProvider appContext={appContext}>
              <ValidationProvider>{children}</ValidationProvider>
            </ReduxStoreProvider>
          </ConfigProvider>
        </RuleTypeProvider>
      </InitialRuleProvider>
    </KibanaServicesProvider>
  );
};
