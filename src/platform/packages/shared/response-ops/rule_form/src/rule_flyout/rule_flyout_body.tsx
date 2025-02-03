/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiStepsHorizontal,
  EuiTitle,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import { checkActionFormActionTypeEnabled } from '@kbn/alerts-ui-shared';
import React, { useCallback, useMemo } from 'react';
import { useRuleFormHorizontalSteps, useRuleFormState } from '../hooks';
import {
  RULE_FLYOUT_HEADER_CREATE_TITLE,
  RULE_FLYOUT_HEADER_EDIT_TITLE,
  DISABLED_ACTIONS_WARNING_TITLE,
} from '../translations';
import type { RuleFormData } from '../types';
import { hasRuleErrors } from '../validation';
import { RuleFlyoutCreateFooter } from './rule_flyout_create_footer';
import { RuleFlyoutEditFooter } from './rule_flyout_edit_footer';
import { RuleFlyoutEditTabs } from './rule_flyout_edit_tabs';
import { RuleFormStepId } from '../constants';

interface RuleFlyoutBodyProps {
  isEdit?: boolean;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (formData: RuleFormData) => void;
  onShowRequest: () => void;
  initialStep?: RuleFormStepId;
}

export const RuleFlyoutBody = ({
  isEdit = false,
  isSaving = false,
  initialStep,
  onCancel,
  onSave,
  onShowRequest,
}: RuleFlyoutBodyProps) => {
  const {
    formData,
    multiConsumerSelection,
    connectorTypes,
    connectors,
    baseErrors = {},
    paramsErrors = {},
    actionsErrors = {},
    actionsParamsErrors = {},
  } = useRuleFormState();

  const hasErrors = useMemo(() => {
    const hasBrokenConnectors = formData.actions.some((action) => {
      return !connectors.find((connector) => connector.id === action.id);
    });

    if (hasBrokenConnectors) {
      return true;
    }

    return hasRuleErrors({
      baseErrors,
      paramsErrors,
      actionsErrors,
      actionsParamsErrors,
    });
  }, [formData, connectors, baseErrors, paramsErrors, actionsErrors, actionsParamsErrors]);

  const {
    steps,
    currentStepComponent,
    goToNextStep,
    goToPreviousStep,
    hasNextStep,
    hasPreviousStep,
  } = useRuleFormHorizontalSteps(initialStep);

  const { actions } = formData;

  const onSaveInternal = useCallback(() => {
    onSave({
      ...formData,
      ...(multiConsumerSelection ? { consumer: multiConsumerSelection } : {}),
    });
  }, [onSave, formData, multiConsumerSelection]);

  const hasActionsDisabled = useMemo(() => {
    const preconfiguredConnectors = connectors.filter((connector) => connector.isPreconfigured);
    return actions.some((action) => {
      const actionType = connectorTypes.find(({ id }) => id === action.actionTypeId);
      if (!actionType) {
        return false;
      }
      const checkEnabledResult = checkActionFormActionTypeEnabled(
        actionType,
        preconfiguredConnectors
      );
      return !actionType.enabled && !checkEnabledResult.isEnabled;
    });
  }, [actions, connectors, connectorTypes]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj={isEdit ? 'editRuleFlyoutTitle' : 'addRuleFlyoutTitle'}>
          <h3 id="flyoutTitle">
            {isEdit ? RULE_FLYOUT_HEADER_EDIT_TITLE : RULE_FLYOUT_HEADER_CREATE_TITLE}
          </h3>
        </EuiTitle>
        {isEdit && <RuleFlyoutEditTabs steps={steps} />}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {!isEdit && <EuiStepsHorizontal size="xs" steps={steps} />}
        {hasActionsDisabled && (
          <>
            <EuiCallOut
              size="s"
              color="danger"
              iconType="error"
              data-test-subj="hasActionsDisabled"
              title={DISABLED_ACTIONS_WARNING_TITLE}
            />
            <EuiSpacer />
          </>
        )}
        {currentStepComponent}
      </EuiFlyoutBody>
      {isEdit ? (
        <RuleFlyoutEditFooter
          onCancel={onCancel}
          onSave={onSaveInternal}
          onShowRequest={onShowRequest}
          isSaving={isSaving}
          hasErrors={hasErrors}
        />
      ) : (
        <RuleFlyoutCreateFooter
          onCancel={onCancel}
          onSave={onSaveInternal}
          onShowRequest={onShowRequest}
          goToNextStep={goToNextStep}
          goToPreviousStep={goToPreviousStep}
          isSaving={isSaving}
          hasNextStep={hasNextStep}
          hasPreviousStep={hasPreviousStep}
          hasErrors={hasErrors}
        />
      )}
    </>
  );
};
