/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import {
  EuiPageTemplate,
  EuiHorizontalRule,
  EuiSteps,
  EuiStepsProps,
  useEuiBackgroundColorCSS,
} from '@elastic/eui';
import { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { RuleDefinition, RuleActions, RuleDetails, RulePageNameInput, RuleTypeModel } from '..';
import { RuleTypeWithDescription } from '../../common/types';

export interface RulePageProps {
  canShowConsumerSelection?: boolean;
  authorizedConsumers?: RuleCreationValidConsumer[];
  selectedRuleTypeModel: RuleTypeModel;
  selectedRuleType: RuleTypeWithDescription;
  validConsumers?: RuleCreationValidConsumer[];
}

export const RulePage = (props: RulePageProps) => {
  const {
    canShowConsumerSelection,
    authorizedConsumers,
    selectedRuleTypeModel,
    selectedRuleType,
    validConsumers,
  } = props;

  const styles = useEuiBackgroundColorCSS().transparent;

  const steps: EuiStepsProps['steps'] = useMemo(() => {
    return [
      {
        title: 'Rule definition',
        status: 'current',
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
        status: 'current',
        children: (
          <>
            <RuleActions onClick={() => {}} />
            <EuiHorizontalRule margin="xl" />
          </>
        ),
      },
      {
        title: 'Rule details',
        status: 'current',
        children: (
          <>
            <RuleDetails />
            <EuiHorizontalRule margin="xl" />
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
        <RulePageNameInput />
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section>
        <EuiSteps steps={steps} />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
