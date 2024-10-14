/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import {
  RuleDefinition,
  RuleActions,
  RuleDetails,
  RulePageNameInput,
  RulePageFooter,
  RuleFormData,
} from '..';
import { useRuleFormState } from '../hooks';
import {
  RULE_FORM_PAGE_RULE_DEFINITION_TITLE,
  RULE_FORM_PAGE_RULE_ACTIONS_TITLE,
  RULE_FORM_PAGE_RULE_DETAILS_TITLE,
  RULE_FORM_RETURN_TITLE,
} from '../translations';

export interface RulePageProps {
  isEdit?: boolean;
  isSaving?: boolean;
  returnUrl: string;
  onSave: (formData: RuleFormData) => void;
}

export const RulePage = (props: RulePageProps) => {
  const { isEdit = false, isSaving = false, returnUrl, onSave } = props;

  const {
    plugins: { application },
    formData,
    multiConsumerSelection,
  } = useRuleFormState();

  const canReadConnectors = !!application.capabilities.actions?.show;

  const styles = useEuiBackgroundColorCSS().transparent;

  const onCancel = useCallback(() => {
    application.navigateToUrl(returnUrl);
  }, [application, returnUrl]);

  const onSaveInternal = useCallback(() => {
    onSave({
      ...formData,
      ...(multiConsumerSelection ? { consumer: multiConsumerSelection } : {}),
    });
  }, [onSave, formData, multiConsumerSelection]);

  const actionComponent = useMemo(() => {
    if (canReadConnectors) {
      return [
        {
          title: RULE_FORM_PAGE_RULE_ACTIONS_TITLE,
          children: (
            <>
              <RuleActions />
              <EuiSpacer />
              <EuiHorizontalRule margin="none" />
            </>
          ),
        },
      ];
    }
    return [];
  }, [canReadConnectors]);

  const steps: EuiStepsProps['steps'] = useMemo(() => {
    return [
      {
        title: RULE_FORM_PAGE_RULE_DEFINITION_TITLE,
        children: <RuleDefinition />,
      },
      ...actionComponent,
      {
        title: RULE_FORM_PAGE_RULE_DETAILS_TITLE,
        children: (
          <>
            <RuleDetails />
            <EuiSpacer />
            <EuiHorizontalRule margin="none" />
          </>
        ),
      },
    ];
  }, [actionComponent]);

  return (
    <EuiPageTemplate grow bottomBorder offset={0} css={styles}>
      <EuiPageTemplate.Header>
        <EuiFlexGroup
          direction="column"
          gutterSize="none"
          alignItems="flexStart"
          className="eui-fullWidth"
        >
          <EuiFlexItem grow={false} style={{ alignItems: 'start' }}>
            <EuiButtonEmpty
              data-test-subj="rulePageReturnButton"
              onClick={onCancel}
              style={{ padding: 0 }}
              iconType="arrowLeft"
              iconSide="left"
              aria-label="Return link"
            >
              {RULE_FORM_RETURN_TITLE}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiSpacer />
          <EuiFlexItem grow={false} className="eui-fullWidth">
            <RulePageNameInput />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section>
        <EuiSteps steps={steps} />
      </EuiPageTemplate.Section>
      <EuiPageTemplate.Section>
        <RulePageFooter
          isEdit={isEdit}
          isSaving={isSaving}
          onCancel={onCancel}
          onSave={onSaveInternal}
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
