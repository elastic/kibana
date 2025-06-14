/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiConfirmModal, EuiText } from '@elastic/eui';
import {
  RULE_FORM_CANCEL_MODAL_TITLE,
  RULE_FORM_CANCEL_MODAL_CONFIRM,
  RULE_FORM_CANCEL_MODAL_CANCEL,
  RULE_FORM_CANCEL_MODAL_DESCRIPTION,
} from '../../translations';

export interface ConfirmRuleCloseRuleProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmRuleClose = (props: ConfirmRuleCloseRuleProps) => {
  const { onCancel, onConfirm } = props;

  return (
    <EuiConfirmModal
      onCancel={onCancel}
      onConfirm={onConfirm}
      data-test-subj="confirmRuleCloseModal"
      buttonColor="danger"
      defaultFocusedButton="confirm"
      title={RULE_FORM_CANCEL_MODAL_TITLE}
      confirmButtonText={RULE_FORM_CANCEL_MODAL_CONFIRM}
      cancelButtonText={RULE_FORM_CANCEL_MODAL_CANCEL}
      aria-label={RULE_FORM_CANCEL_MODAL_TITLE}
    >
      <EuiText>
        <p>{RULE_FORM_CANCEL_MODAL_DESCRIPTION}</p>
      </EuiText>
    </EuiConfirmModal>
  );
};
