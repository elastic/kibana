/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiPageTemplate,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSteps,
  EuiStepsProps,
  useEuiBackgroundColorCSS,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import {
  RuleDefinition,
  RuleActions,
  RuleDetails,
  RulePageNameInput,
  RulePageFooter,
  RuleTypeModel,
  RuleFormData,
} from '..';
import { RuleTypeWithDescription } from '../../common/types';
import { useRuleFormState } from '../hooks';

export interface RulePageProps {
  canShowConsumerSelection?: boolean;
  authorizedConsumers?: RuleCreationValidConsumer[];
  selectedRuleTypeModel: RuleTypeModel;
  selectedRuleType: RuleTypeWithDescription;
  validConsumers?: RuleCreationValidConsumer[];
  isEdit?: boolean;
  isSaving?: boolean;
  onSave: (formData: RuleFormData) => void;
}

export const RulePage = (props: RulePageProps) => {
  const {
    canShowConsumerSelection = false,
    authorizedConsumers,
    selectedRuleTypeModel,
    selectedRuleType,
    validConsumers,
    isEdit = false,
    isSaving = false,
    onSave,
  } = props;

  const {
    plugins: { application },
  } = useRuleFormState();

  const styles = useEuiBackgroundColorCSS().transparent;

  const onCancel = useCallback(() => {
    application.navigateToUrl(window.location.pathname.split('rule')[0], {
      forceRedirect: true,
    });
  }, [application]);

  const steps: EuiStepsProps['steps'] = useMemo(() => {
    return [
      {
        title: 'Rule definition',
        children: (
          <RuleDefinition
            canShowConsumerSelection={canShowConsumerSelection}
            authorizedConsumers={authorizedConsumers}
            selectedRuleTypeModel={selectedRuleTypeModel}
            selectedRuleType={selectedRuleType}
            validConsumers={validConsumers}
          />
        ),
      },
      {
        title: 'Actions',
        children: (
          <>
            <RuleActions onClick={() => {}} />
            <EuiSpacer />
            <EuiHorizontalRule margin="none" />
          </>
        ),
      },
      {
        title: 'Rule details',
        children: (
          <>
            <RuleDetails />
            <EuiSpacer />
            <EuiHorizontalRule margin="none" />
          </>
        ),
      },
    ];
  }, [
    canShowConsumerSelection,
    authorizedConsumers,
    selectedRuleTypeModel,
    selectedRuleType,
    validConsumers,
  ]);

  return (
    <EuiPageTemplate grow bottomBorder offset={0} css={styles}>
      <EuiPageTemplate.Header>
        <EuiFlexGroup direction="column" gutterSize="none" alignItems="flexStart">
          <EuiFlexItem>
            <EuiButtonEmpty
              href={window.location.pathname.split('rule')[0]}
              style={{ padding: 0 }}
              iconType="arrowLeft"
              iconSide="left"
              aria-label="Return link"
            >
              Return
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiSpacer />
          <EuiFlexItem grow={10}>
            <RulePageNameInput />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section>
        <EuiSteps steps={steps} />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section>
        <RulePageFooter isEdit={isEdit} isSaving={isSaving} onCancel={onCancel} onSave={onSave} />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
