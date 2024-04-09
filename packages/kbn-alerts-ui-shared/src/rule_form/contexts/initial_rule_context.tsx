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
import { Rule } from '../types';
import { useResolveRuleApi } from '../apis';

const InitialRuleContext = createContext<Rule | null>(null);

const EditRuleProvider: React.FC<{
  ruleId: string;
  onLoadRuleSuccess: (ruleTypeId: string, ruleName: string) => void;
}> = ({ ruleId, onLoadRuleSuccess, children }) => {
  // TODO: Figure out how to reset this if the user edits the rule, saves it, and then clicks the back
  // button. They currently need to refresh the page to reload the rule after changing it.
  const [hasLoaded, setHasLoaded] = useState(false);

  const { rule, isSuccess, isLoading } = useResolveRuleApi({
    ruleId,
    onSuccess: (rule: ResolvedRule) => {
      setHasLoaded(true);
      onLoadRuleSuccess(rule.ruleTypeId, rule.name);
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
  onLoadRuleSuccess: (ruleTypeId: string) => void;
}> = ({ ruleId, isEdit, onLoadRuleSuccess, children }) => {
  if (!isEdit) {
    return <InitialRuleContext.Provider value={null}>{children}</InitialRuleContext.Provider>;
  } else
    return (
      <EditRuleProvider ruleId={ruleId} onLoadRuleSuccess={onLoadRuleSuccess}>
        {children}
      </EditRuleProvider>
    );
};
export const useInitialRule = () => useContext(InitialRuleContext);
