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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import {
  SHOW_REQUEST_MODAL_SUBTITLE,
  SHOW_REQUEST_MODAL_TITLE,
  RULE_FLYOUT_FOOTER_BACK_TEXT,
  RULE_FLYOUT_HEADER_BACK_TEXT,
} from '../translations';
import { RequestCodeBlock } from '../request_code_block';

interface RuleFlyoutShowRequestProps {
  isEdit: boolean;
  onClose: () => void;
}
export const RuleFlyoutShowRequest = ({ isEdit, onClose }: RuleFlyoutShowRequestProps) => {
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="arrowLeft"
              onClick={onClose}
              aria-label={RULE_FLYOUT_HEADER_BACK_TEXT}
              color="text"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs" data-test-subj="ruleFlyoutShowRequestTitle">
              <h4 id="flyoutTitle">{SHOW_REQUEST_MODAL_TITLE(isEdit)}</h4>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <p>
          <EuiText color="subdued">{SHOW_REQUEST_MODAL_SUBTITLE(isEdit)}</EuiText>
        </p>
        <EuiSpacer />
        <RequestCodeBlock isEdit={isEdit} data-test-subj="flyoutRequestCodeBlock" />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty
          iconType="arrowLeft"
          onClick={onClose}
          data-test-subj="ruleFlyoutShowRequestBackButton"
        >
          {RULE_FLYOUT_FOOTER_BACK_TEXT}
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </>
  );
};
