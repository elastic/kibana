/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import { useLoadRuleTypesQuery } from '../../common/hooks';
import { RuleTypeModel } from '../types';
import { useKibanaServices } from './kibana_services_context';

const RuleTypeContext = createContext<RuleTypeModel>({} as RuleTypeModel);

type RuleTypeModelFromRegistry = Omit<RuleTypeModel, 'name' | 'authorizedConsumers'>;

export const RuleTypeProvider: React.FC<{
  registeredRuleTypeModel: RuleTypeModelFromRegistry | null;
  isRuleTypeModelPending: boolean;
}> = ({ registeredRuleTypeModel, isRuleTypeModelPending, children }) => {
  const { http, toasts } = useKibanaServices();
  const { id: ruleTypeId } = registeredRuleTypeModel ?? {};

  const {
    ruleTypesState,
    authorizedRuleTypes,
    isSuccess: isLoadRuleTypesSuccess,
  } = useLoadRuleTypesQuery({ filteredRuleTypes: [], http, toasts });

  const ruleTypeFromServer = useMemo(
    () => authorizedRuleTypes.find((ruleType) => ruleType.id === ruleTypeId),
    [authorizedRuleTypes, ruleTypeId]
  );

  if (ruleTypesState.isLoading || isRuleTypeModelPending) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingLogo size="xl" />}
        title={
          <h2>
            {i18n.translate('alertsUIShared.ruleForm.ruleTypeProvider.loadingTitle', {
              defaultMessage: 'Loading Rule Form',
            })}
          </h2>
        }
      />
    );
  }

  if (!isLoadRuleTypesSuccess) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        title={
          <h2>
            {i18n.translate('alertsUIShared.ruleForm.ruleTypeProvider.errorTitle', {
              defaultMessage: 'Error loading rule form',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('alertsUIShared.ruleForm.ruleTypeProvider.errorMessage', {
              defaultMessage: 'An error occurred while loading rule types',
            })}
          </p>
        }
      />
    );
  }

  if (!ruleTypeFromServer || !registeredRuleTypeModel) {
    return (
      <EuiEmptyPrompt
        color="danger"
        iconType="error"
        title={
          <h2>
            {i18n.translate('alertsUIShared.ruleForm.ruleTypeProvider.unauthorizedErrorTitle', {
              defaultMessage: 'Rule type not found or unauthorized',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('alertsUIShared.ruleForm.ruleTypeProvider.unauthorizedErrorMessage', {
              defaultMessage: 'No authorized rule type with the id {ruleTypeId} could be found',
              values: { ruleTypeId },
            })}
          </p>
        }
      />
    );
  }

  return (
    <RuleTypeContext.Provider
      value={{
        ...registeredRuleTypeModel,
        name: ruleTypeFromServer.name,
        authorizedConsumers: ruleTypeFromServer.authorizedConsumers,
      }}
    >
      {children}
    </RuleTypeContext.Provider>
  );
};
export const useRuleType = () => useContext(RuleTypeContext);
