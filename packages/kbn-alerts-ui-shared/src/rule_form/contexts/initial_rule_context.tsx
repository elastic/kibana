/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import { RuleFormRule } from '../types';
import { useResolveRuleApi } from '../apis';

const InitialRuleContext = createContext<RuleFormRule | undefined>(undefined);

export type OnLoadRuleSuccess = (ruleTypeId: string, ruleName: string) => void;

const EditRuleProvider: React.FC<{
  ruleId: string;
  onLoadRuleSuccess: OnLoadRuleSuccess;
}> = ({ ruleId, onLoadRuleSuccess, children }) => {
  const [hasLoaded, setHasLoaded] = useState(false);

  const { rule, isSuccess, isLoading } = useResolveRuleApi({
    ruleId,
    enabled: !hasLoaded,
    onSuccess: (loadedRule: RuleFormRule) => {
      setHasLoaded(true);
      onLoadRuleSuccess(loadedRule.ruleTypeId, loadedRule.name);
    },
  });

  if (isLoading) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingLogo size="xl" />}
        title={
          <h2>
            {i18n.translate('alertsUIShared.ruleForm.initialRuleProvider.loadingTitle', {
              defaultMessage: 'Loading Rule Form',
            })}
          </h2>
        }
      />
    );
  }

  if (!isSuccess) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        title={
          <h2>
            {i18n.translate('alertsUIShared.ruleForm.initialRuleProvider.errorTitle', {
              defaultMessage: 'Error loading rule form',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('alertsUIShared.ruleForm.initialRuleProvider.errorMessage', {
              defaultMessage: 'An error occurred while loading the existing rule',
            })}
          </p>
        }
      />
    );
  }

  return <InitialRuleContext.Provider value={rule}>{children}</InitialRuleContext.Provider>;
};

export const InitialRuleProvider: React.FC<{
  ruleId: string;
  isEdit?: boolean;
  onLoadRuleSuccess: OnLoadRuleSuccess;
}> = ({ ruleId, isEdit, onLoadRuleSuccess, children }) => {
  if (!isEdit) {
    return <InitialRuleContext.Provider value={undefined}>{children}</InitialRuleContext.Provider>;
  } else
    return (
      <EditRuleProvider ruleId={ruleId} onLoadRuleSuccess={onLoadRuleSuccess}>
        {children}
      </EditRuleProvider>
    );
};
export const useInitialRule = () => useContext(InitialRuleContext);
