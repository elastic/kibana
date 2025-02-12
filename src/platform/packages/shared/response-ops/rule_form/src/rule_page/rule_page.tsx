/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSpacer,
  EuiSteps,
} from '@elastic/eui';
import { checkActionFormActionTypeEnabled } from '@kbn/alerts-ui-shared';
import React, { useCallback, useMemo, useState } from 'react';
import { useRuleFormScreenContext, useRuleFormState, useRuleFormSteps } from '../hooks';
import {
  DISABLED_ACTIONS_WARNING_TITLE,
  RULE_FORM_CANCEL_MODAL_CANCEL,
  RULE_FORM_CANCEL_MODAL_CONFIRM,
  RULE_FORM_CANCEL_MODAL_DESCRIPTION,
  RULE_FORM_CANCEL_MODAL_TITLE,
  RULE_FORM_RETURN_TITLE,
} from '../translations';
import type { RuleFormData } from '../types';
import { RulePageFooter } from './rule_page_footer';
import { RulePageNameInput } from './rule_page_name_input';
import { RuleActionsConnectorsModal } from '../rule_actions/rule_actions_connectors_modal';
import { RulePageShowRequestModal } from './rule_page_show_request_modal';

export interface RulePageProps {
  isEdit?: boolean;
  isSaving?: boolean;
  onCancel?: () => void;
  onSave: (formData: RuleFormData) => void;
}

export const RulePage = (props: RulePageProps) => {
  const { isEdit = false, isSaving = false, onCancel = () => {}, onSave } = props;
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);

  const { formData, multiConsumerSelection, connectorTypes, connectors, touched } =
    useRuleFormState();

  const { steps } = useRuleFormSteps();

  const { actions } = formData;

  const styles = {
    backgroundColor: 'transparent',
  };

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

  const { isConnectorsScreenVisible, isShowRequestScreenVisible } = useRuleFormScreenContext();

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
      {isConnectorsScreenVisible && <RuleActionsConnectorsModal />}
      {isShowRequestScreenVisible && <RulePageShowRequestModal isEdit={isEdit} />}
    </>
  );
};
