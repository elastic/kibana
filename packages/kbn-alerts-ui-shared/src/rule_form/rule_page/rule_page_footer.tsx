/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiButtonEmpty } from '@elastic/eui';
import {
  RULE_PAGE_FOOTER_CANCEL_TEXT,
  RULE_PAGE_FOOTER_SHOW_REQUEST_TEXT,
  RULE_PAGE_FOOTER_CREATE_TEXT,
  RULE_PAGE_FOOTER_SAVE_TEXT,
} from '../translations';
import { useRuleFormState } from '../hooks';
import { hasRuleErrors } from '../validation';
import { RulePageShowRequestModal } from './rule_page_show_request_modal';
import { RulePageConfirmCreateRule } from './rule_page_confirm_create_rule';

export interface RulePageFooterProps {
  isEdit?: boolean;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export const RulePageFooter = (props: RulePageFooterProps) => {
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
  const [showCreateConfirmation, setShowCreateConfirmation] = useState<boolean>(false);

  const { isEdit = false, isSaving = false, onCancel, onSave } = props;

  const { baseErrors, paramsErrors } = useRuleFormState();

  const hasErrors = useMemo(() => {
    return hasRuleErrors({
      baseErrors: baseErrors || {},
      paramsErrors: paramsErrors || {},
    });
  }, [baseErrors, paramsErrors]);

  const saveButtonText = useMemo(() => {
    if (isEdit) {
      return RULE_PAGE_FOOTER_SAVE_TEXT;
    }
    return RULE_PAGE_FOOTER_CREATE_TEXT;
  }, [isEdit]);

  const onOpenShowRequestModalClick = useCallback(() => {
    setShowRequestModal(true);
  }, []);

  const onCloseShowRequestModalClick = useCallback(() => {
    setShowRequestModal(false);
  }, []);

  const onSaveClick = useCallback(() => {
    if (isEdit) {
      onSave();
    } else {
      setShowCreateConfirmation(true);
    }
  }, [isEdit, onSave]);

  const onCreateConfirmClick = useCallback(() => {
    setShowCreateConfirmation(false);
    onSave();
  }, [onSave]);

  const onCreateCancelClick = useCallback(() => {
    setShowCreateConfirmation(false);
  }, []);

  return (
    <>
      <EuiFlexGroup data-test-subj="rulePageFooter" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="rulePageFooterCancelButton"
            onClick={onCancel}
            disabled={isSaving}
            isLoading={isSaving}
          >
            {RULE_PAGE_FOOTER_CANCEL_TEXT}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="rulePageFooterShowRequestButton"
                onClick={onOpenShowRequestModalClick}
                disabled={isSaving || hasErrors}
                isLoading={isSaving}
              >
                {RULE_PAGE_FOOTER_SHOW_REQUEST_TEXT}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                data-test-subj="rulePageFooterSaveButton"
                onClick={onSaveClick}
                disabled={isSaving || hasErrors}
                isLoading={isSaving}
              >
                {saveButtonText}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {showRequestModal && (
        <RulePageShowRequestModal onClose={onCloseShowRequestModalClick} isEdit={isEdit} />
      )}
      {showCreateConfirmation && (
        <RulePageConfirmCreateRule
          onConfirm={onCreateConfirmClick}
          onCancel={onCreateCancelClick}
        />
      )}
    </>
  );
};
