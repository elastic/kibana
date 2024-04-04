/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { EuiPageTemplate, EuiSteps } from '@elastic/eui';
import { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { useRuleFormSelector, useRuleFormDispatch } from '../hooks';
import { setRuleName } from '../features/rule_details/slice';
import { RuleFormPageHeader } from './header';
import { RuleDetails, RuleDefinition } from '../features';
import { RuleTypeModel, RuleTypeParamsExpressionPlugins } from '../types';
import { useValidationContext } from '../hooks/validation_context';
import { ValidationStatus } from '../common/constants';

export interface RuleFormPageProps {
  ruleTypeModel: RuleTypeModel;
  expressionPlugins: RuleTypeParamsExpressionPlugins;
  onClickReturn: () => void;
  referrerHref?: string;
  docLinks: DocLinksStart;
  canShowConsumerSelection?: boolean;
  authorizedConsumers?: RuleCreationValidConsumer[];
}

const validationStatusToStepStatus: (
  status: ValidationStatus
) => 'incomplete' | 'danger' | undefined = (status) => {
  switch (status) {
    case ValidationStatus.INCOMPLETE:
      return 'incomplete';
    case ValidationStatus.INVALID:
      return 'danger';
  }
};

export const RuleFormPage: React.FC<RuleFormPageProps> = ({
  onClickReturn,
  referrerHref,
  ruleTypeModel,
  expressionPlugins,
  docLinks,
  canShowConsumerSelection,
  authorizedConsumers,
}) => {
  const ruleName = useRuleFormSelector((state) => state.ruleDetails.name);
  const dispatch = useRuleFormDispatch();
  const validation = useValidationContext();
  const stepStatuses = useMemo(
    () => ({
      ruleDefinition: validationStatusToStepStatus(validation.ruleDefinition.status),
      ruleDetails: validationStatusToStepStatus(validation.ruleDetails.status),
    }),
    [validation]
  );

  return (
    <>
      <RuleFormPageHeader
        ruleName={ruleName}
        onChangeName={(name) => dispatch(setRuleName(name))}
        onClickReturn={onClickReturn}
        referrerHref={referrerHref}
      />
      <EuiPageTemplate.Section>
        <EuiSteps
          steps={[
            {
              title: 'Rule definition',
              status: stepStatuses.ruleDefinition,
              children: (
                <RuleDefinition
                  ruleTypeModel={ruleTypeModel}
                  expressionPlugins={expressionPlugins}
                  docLinks={docLinks}
                  canShowConsumerSelection={canShowConsumerSelection}
                  authorizedConsumers={authorizedConsumers}
                />
              ),
            },
            {
              title: 'Actions',
              children: (
                // TODO: Actions form will be implemented in a later PR
                <div>
                  Action form is WIP. You can only create a rule without actions in this version of
                  the form.
                </div>
              ),
            },
            {
              title: 'Rule details',
              children: <RuleDetails />,
              status: stepStatuses.ruleDetails,
            },
          ]}
        />
      </EuiPageTemplate.Section>
    </>
  );
};
