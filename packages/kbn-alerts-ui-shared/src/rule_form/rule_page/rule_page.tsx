/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
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
  EuiCallOut,
  EuiConfirmModal,
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
  DISABLED_ACTIONS_WARNING_TITLE,
  RULE_FORM_CANCEL_MODAL_TITLE,
  RULE_FORM_CANCEL_MODAL_DESCRIPTION,
  RULE_FORM_CANCEL_MODAL_CONFIRM,
  RULE_FORM_CANCEL_MODAL_CANCEL,
} from '../translations';
import { hasActionsError, hasActionsParamsErrors, hasParamsErrors } from '../validation';
import { checkActionFormActionTypeEnabled } from '../utils/check_action_type_enabled';

export interface RulePageProps {
  isEdit?: boolean;
  isSaving?: boolean;
  onCancel?: () => void;
  onSave: (formData: RuleFormData) => void;
}

export const RulePage = (props: RulePageProps) => {
  const { isEdit = false, isSaving = false, onCancel = () => {}, onSave } = props;
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);

  const {
    plugins: { application },
    baseErrors = {},
    paramsErrors = {},
    actionsErrors = {},
    actionsParamsErrors = {},
    formData,
    multiConsumerSelection,
    connectorTypes,
    connectors,
    touched,
  } = useRuleFormState();

  const { actions } = formData;

  const canReadConnectors = !!application.capabilities.actions?.show;

  const styles = useEuiBackgroundColorCSS().transparent;

  const onSaveInternal = useCallback(() => {
    onSave({
      ...formData,
      ...(multiConsumerSelection ? { consumer: multiConsumerSelection } : {}),
    });
  }, [onSave, formData, multiConsumerSelection]);

  const onCancelInternal = useCallback(() => {
    if (touched) {
      setIsCancelModalOpen(true);
    } else {
      onCancel();
    }
  }, [touched, onCancel]);

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

  const hasRuleDefinitionErrors = useMemo(() => {
    return !!(
      hasParamsErrors(paramsErrors) ||
      baseErrors.interval?.length ||
      baseErrors.alertDelay?.length
    );
  }, [paramsErrors, baseErrors]);

  const hasActionErrors = useMemo(() => {
    return hasActionsError(actionsErrors) || hasActionsParamsErrors(actionsParamsErrors);
  }, [actionsErrors, actionsParamsErrors]);

  const hasRuleDetailsError = useMemo(() => {
    return baseErrors.name?.length || baseErrors.tags?.length;
  }, [baseErrors]);

  const actionComponent: EuiStepsProps['steps'] = useMemo(() => {
    if (canReadConnectors) {
      return [
        {
          title: RULE_FORM_PAGE_RULE_ACTIONS_TITLE,
          status: hasActionErrors ? 'danger' : undefined,
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
  }, [hasActionErrors, canReadConnectors]);

  const steps: EuiStepsProps['steps'] = useMemo(() => {
    return [
      {
        title: RULE_FORM_PAGE_RULE_DEFINITION_TITLE,
        status: hasRuleDefinitionErrors ? 'danger' : undefined,
        children: <RuleDefinition />,
      },
      ...actionComponent,
      {
        title: RULE_FORM_PAGE_RULE_DETAILS_TITLE,
        status: hasRuleDetailsError ? 'danger' : undefined,
        children: (
          <>
            <RuleDetails />
            <EuiSpacer />
            <EuiHorizontalRule margin="none" />
          </>
        ),
      },
    ];
  }, [hasRuleDefinitionErrors, hasRuleDetailsError, actionComponent]);

  return (
    <>
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
                onClick={onCancelInternal}
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
          <EuiSteps steps={steps} />
        </EuiPageTemplate.Section>
        <EuiPageTemplate.Section>
          <RulePageFooter
            isEdit={isEdit}
            isSaving={isSaving}
            onCancel={onCancelInternal}
            onSave={onSaveInternal}
          />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
      {isCancelModalOpen && (
        <EuiConfirmModal
          onCancel={() => setIsCancelModalOpen(false)}
          onConfirm={onCancel}
          data-test-subj="confirmRuleCloseModal"
          buttonColor="danger"
          defaultFocusedButton="confirm"
          title={RULE_FORM_CANCEL_MODAL_TITLE}
          confirmButtonText={RULE_FORM_CANCEL_MODAL_CONFIRM}
          cancelButtonText={RULE_FORM_CANCEL_MODAL_CANCEL}
        >
          <p>{RULE_FORM_CANCEL_MODAL_DESCRIPTION}</p>
        </EuiConfirmModal>
      )}
    </>
  );
};
