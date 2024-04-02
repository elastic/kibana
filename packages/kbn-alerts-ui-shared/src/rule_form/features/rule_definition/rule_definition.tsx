/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import React, { Suspense } from 'react';
import { useRuleFormSelector, useRuleFormDispatch } from '../../hooks';
import { RuleTypeModel, RuleTypeParamsExpressionPlugins } from '../../types';
import { setParam, replaceParams } from './slice';

interface RuleDefinitionProps {
  ruleTypeModel: RuleTypeModel;
  expressionPlugins: RuleTypeParamsExpressionPlugins;
}

export const RuleDefinition: React.FC<RuleDefinitionProps> = ({
  ruleTypeModel,
  expressionPlugins,
}) => {
  const ruleId = useRuleFormSelector((state) => state.ruleDefinition.id);
  const ruleParams = useRuleFormSelector((state) => state.ruleDefinition.params);
  const dispatch = useRuleFormDispatch();

  const RuleParamsExpressionComponent = ruleTypeModel.ruleParamsExpression ?? null;

  const { errors } = ruleTypeModel.validate(ruleParams);

  return (
    <div>
      <Suspense
        fallback={
          <EuiEmptyPrompt
            title={<EuiLoadingSpinner size="xl" />}
            body={i18n.translate('alertsUIShared.ruleFormPage.loadingRuleTypeParams', {
              defaultMessage: 'Loading rule type params',
            })}
          />
        }
      >
        <RuleParamsExpressionComponent
          id={ruleId}
          ruleParams={ruleParams}
          ruleInterval={'1m'}
          ruleThrottle={''}
          alertNotifyWhen={'onActionGroupChange'}
          errors={errors}
          setRuleParams={(key, value) => dispatch(setParam([key, value]))}
          setRuleProperty={(_, value) => {
            /* setRuleProperty is only ever used to replace all params */
            /* Deprecated in favor of defining default parameters */
            dispatch(replaceParams(value));
          }}
          defaultActionGroupId={'default'}
          actionGroups={[{ id: 'default', name: 'Default' }]}
          metadata={{}}
          onChangeMetaData={() => {}}
          {...expressionPlugins}
        />
      </Suspense>
    </div>
  );
};
