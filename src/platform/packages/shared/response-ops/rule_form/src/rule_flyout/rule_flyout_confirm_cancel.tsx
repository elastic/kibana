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
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React from 'react';
import {
  RULE_FORM_CANCEL_MODAL_DESCRIPTION,
  RULE_FORM_CANCEL_MODAL_TITLE,
  RULE_FORM_CANCEL_MODAL_CANCEL,
  RULE_FORM_CANCEL_MODAL_CONFIRM,
} from '../translations';

interface RuleFlyoutShowRequestProps {
  onBack: () => void;
  onConfirm: () => void;
}
export const RuleFlyoutConfirmCancel = ({ onBack, onConfirm }: RuleFlyoutShowRequestProps) => {
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="xs" data-test-subj="ruleFlyoutShowRequestTitle">
          <h4 id="flyoutTitle">{RULE_FORM_CANCEL_MODAL_TITLE}</h4>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <p>
          <EuiText>{RULE_FORM_CANCEL_MODAL_DESCRIPTION}</EuiText>
        </p>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onBack} data-test-subj="ruleFlyoutConfirmCancelBackButton">
              {RULE_FORM_CANCEL_MODAL_CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="danger"
              onClick={onConfirm}
              data-test-subj="ruleFlyoutConfirmCancelConfirmButton"
            >
              {RULE_FORM_CANCEL_MODAL_CONFIRM}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
