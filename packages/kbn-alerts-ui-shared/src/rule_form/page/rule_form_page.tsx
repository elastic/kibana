/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { getRouterLinkProps } from '@kbn/router-utils';
import React, { useMemo } from 'react';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { EuiPageTemplate, EuiSteps, EuiFlexGroup, EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';
import { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { useRuleFormSelector, useRuleFormDispatch } from '../hooks';
import { setRuleName } from '../features/rule_details/slice';
import { RuleFormPageHeader } from './header';
import { RuleDetails, RuleDefinition, SaveRuleButton } from '../features';
import { RuleTypeParamsExpressionPlugins } from '../types';
import { useValidation } from '../contexts';
import { ValidationStatus } from '../common/constants';

export interface RuleFormPageProps {
  expressionPlugins: RuleTypeParamsExpressionPlugins;
  onClickReturn: () => void;
  onSaveRule: (ruleId: string) => void;
  referrerHref?: string;
  docLinks: DocLinksStart;
  isEdit?: boolean;
  canShowConsumerSelection?: boolean;
  validConsumers?: RuleCreationValidConsumer[];
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
  onSaveRule,
  referrerHref,
  expressionPlugins,
  docLinks,
  canShowConsumerSelection,
  validConsumers,
  isEdit,
}) => {
  const ruleName = useRuleFormSelector((state) => state.ruleDetails.name);
  const dispatch = useRuleFormDispatch();
  const validation = useValidation();
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
                  expressionPlugins={expressionPlugins}
                  docLinks={docLinks}
                  canShowConsumerSelection={canShowConsumerSelection}
                  validConsumers={validConsumers}
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
      <EuiPageTemplate.Section>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            {referrerHref && (
              <EuiButtonEmpty
                {...getRouterLinkProps({ href: referrerHref, onClick: onClickReturn })}
              >
                {i18n.translate('alertsUIShared.ruleForm.cancelButton', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SaveRuleButton isEdit={isEdit} onSuccessfulSave={onSaveRule} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </>
  );
};
