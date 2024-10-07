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
  CONFIRMATION_RULE_SAVE_TITLE,
  CONFIRM_RULE_SAVE_CONFIRM_BUTTON_TEXT,
  CONFIRM_RULE_SAVE_CANCEL_BUTTON_TEXT,
  CONFIRM_RULE_SAVE_MESSAGE_TEXT,
} from '../translations';

export interface RulePageConfirmCreateRuleProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export const RulePageConfirmCreateRule = (props: RulePageConfirmCreateRuleProps) => {
  const { onCancel, onConfirm } = props;

  return (
    <EuiConfirmModal
      data-test-subj="rulePageConfirmCreateRule"
      title={CONFIRMATION_RULE_SAVE_TITLE}
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
