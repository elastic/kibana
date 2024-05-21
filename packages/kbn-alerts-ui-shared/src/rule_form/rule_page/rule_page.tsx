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
  EuiSpacer,
  EuiSteps,
  EuiStepsProps,
  EuiBreadcrumbsProps,
  useEuiBackgroundColorCSS,
  EuiIcon,
} from '@elastic/eui';
import { RuleCreationValidConsumer } from '@kbn/rule-data-utils';
import { getRouterLinkProps } from '@kbn/router-utils';
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

export interface RulePageProps {
  canShowConsumerSelection?: boolean;
  authorizedConsumers?: RuleCreationValidConsumer[];
  selectedRuleTypeModel: RuleTypeModel;
  selectedRuleType: RuleTypeWithDescription;
  validConsumers?: RuleCreationValidConsumer[];
  referrerHref?: string;
  isEdit?: boolean;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (formData: RuleFormData) => void;
}

export const RulePage = (props: RulePageProps) => {
  const {
    canShowConsumerSelection = false,
    authorizedConsumers,
    selectedRuleTypeModel,
    selectedRuleType,
    validConsumers,
    referrerHref,
    isEdit = false,
    isSaving = false,
    onCancel,
    onSave,
  } = props;

  const styles = useEuiBackgroundColorCSS().transparent;

  const breadcrumbs: EuiBreadcrumbsProps['breadcrumbs'] = useMemo(() => {
    if (referrerHref) {
      return [
        {
          text: (
            <>
              <EuiIcon size="s" type="arrowLeft" /> Return
            </>
          ),
          color: 'primary',
          'aria-current': false,
          ...getRouterLinkProps({ href: referrerHref, onClick: onCancel }),
        },
      ];
    }
    return [];
  }, [onCancel, referrerHref]);

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
      <EuiPageTemplate.Header breadcrumbs={breadcrumbs}>
        <RulePageNameInput />
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
