/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import {
  CONFIRMATION_RULE_SAVE_TITLE,
  CONFIRM_RULE_SAVE_CONFIRM_BUTTON_TEXT,
  CONFIRM_RULE_SAVE_CANCEL_BUTTON_TEXT,
  CONFIRM_RULE_SAVE_MESSAGE_TEXT,
} from '../../translations';

export interface ConfirmCreateRuleProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmCreateRule = (props: ConfirmCreateRuleProps) => {
  const { onCancel, onConfirm } = props;
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      data-test-subj="confirmCreateRuleModal"
      title={CONFIRMATION_RULE_SAVE_TITLE}
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={CONFIRM_RULE_SAVE_CONFIRM_BUTTON_TEXT}
      cancelButtonText={CONFIRM_RULE_SAVE_CANCEL_BUTTON_TEXT}
      defaultFocusedButton="confirm"
    >
      <EuiText>
        <p>{CONFIRM_RULE_SAVE_MESSAGE_TEXT}</p>
      </EuiText>
    </EuiConfirmModal>
  );
};
