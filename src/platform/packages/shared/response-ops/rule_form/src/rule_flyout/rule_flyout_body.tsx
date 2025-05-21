/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiCallOut,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiTitle,
} from '@elastic/eui';
import { checkActionFormActionTypeEnabled } from '@kbn/alerts-ui-shared';
import { isEmpty } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RuleFormStepId } from '../constants';
import { useRuleFormHorizontalSteps, useRuleFormState } from '../hooks';
import {
  DISABLED_ACTIONS_WARNING_TITLE,
  RULE_FLYOUT_HEADER_CREATE_TITLE,
  RULE_FLYOUT_HEADER_EDIT_TITLE,
} from '../translations';
import type { RuleFormData, RuleFormState } from '../types';
import { hasRuleErrors } from '../validation';
import { RuleFlyoutCreateFooter } from './rule_flyout_create_footer';
import { RuleFlyoutEditFooter } from './rule_flyout_edit_footer';
import { RuleFlyoutEditTabs } from './rule_flyout_edit_tabs';
import { ConfirmCreateRule } from '../components';

interface RuleFlyoutBodyProps {
  isEdit?: boolean;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (formData: RuleFormData) => void;
  onInteraction: () => void;
  onShowRequest: () => void;
  onChangeMetaData?: (metadata?: RuleFormState['metadata']) => void;
  initialStep?: RuleFormStepId;
}

export const RuleFlyoutBody = ({
  isEdit = false,
  isSaving = false,
  initialStep,
  onCancel,
  onSave,
  onInteraction,
  onShowRequest,
  onChangeMetaData = () => {},
}: RuleFlyoutBodyProps) => {
  const [showCreateConfirmation, setShowCreateConfirmation] = useState<boolean>(false);

  const {
    formData,
    multiConsumerSelection,
    connectorTypes,
    connectors,
    baseErrors = {},
    paramsErrors = {},
    actionsErrors = {},
    actionsParamsErrors = {},
    metadata = {},
  } = useRuleFormState();

  useEffect(() => {
    if (!isEmpty(metadata)) {
      onChangeMetaData(metadata);
    }
  }, [metadata, onChangeMetaData]);

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

  const onSaveInternal = useCallback(() => {
    onSave({
      ...formData,
      ...(multiConsumerSelection ? { consumer: multiConsumerSelection } : {}),
    });
  }, [onSave, formData, multiConsumerSelection]);

  const onClickSave = useCallback(() => {
    if (!hasActionsDisabled && actions.length === 0) {
      setShowCreateConfirmation(true);
    } else {
      onSaveInternal();
    }
  }, [actions.length, hasActionsDisabled, onSaveInternal]);

  const onCreateConfirmClick = useCallback(() => {
    setShowCreateConfirmation(false);
    onSaveInternal();
  }, [onSaveInternal]);

  const onCreateCancelClick = useCallback(() => {
    setShowCreateConfirmation(false);
  }, []);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj={isEdit ? 'editRuleFlyoutTitle' : 'addRuleFlyoutTitle'}>
          <h3
            id="flyoutTitle"
            data-test-subj="ruleFlyoutTitle"
            aria-label={isEdit ? RULE_FLYOUT_HEADER_EDIT_TITLE : RULE_FLYOUT_HEADER_CREATE_TITLE}
          >
            {isEdit ? RULE_FLYOUT_HEADER_EDIT_TITLE : RULE_FLYOUT_HEADER_CREATE_TITLE}
          </h3>
        </EuiTitle>
        {isEdit && <RuleFlyoutEditTabs steps={steps} />}
      </EuiFlyoutHeader>
      <EuiFlyoutBody onClick={onInteraction} onKeyDown={onInteraction}>
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
          onSave={onClickSave}
          onShowRequest={onShowRequest}
          isSaving={isSaving}
          hasErrors={hasErrors}
        />
      ) : (
        <RuleFlyoutCreateFooter
          onCancel={onCancel}
          onSave={onClickSave}
          onShowRequest={onShowRequest}
          goToNextStep={goToNextStep}
          goToPreviousStep={goToPreviousStep}
          isSaving={isSaving}
          hasNextStep={hasNextStep}
          hasPreviousStep={hasPreviousStep}
          hasErrors={hasErrors}
        />
      )}
      {showCreateConfirmation && (
        <ConfirmCreateRule onConfirm={onCreateConfirmClick} onCancel={onCreateCancelClick} />
      )}
    </>
  );
};
