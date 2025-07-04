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
  EuiTitle,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React from 'react';
import {
  ACTION_TYPE_MODAL_TITLE,
  RULE_FLYOUT_FOOTER_BACK_TEXT,
  RULE_FLYOUT_HEADER_BACK_TEXT,
} from '../translations';
import { RuleActionsConnectorsBody } from '../rule_actions/rule_actions_connectors_body';

interface RuleFlyoutSelectConnectorProps {
  onClose: () => void;
}
export const RuleFlyoutSelectConnector = ({ onClose }: RuleFlyoutSelectConnectorProps) => {
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
            <EuiTitle size="xs" data-test-subj="ruleFlyoutSelectConnectorTitle">
              <h4 id="flyoutTitle">{ACTION_TYPE_MODAL_TITLE}</h4>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <RuleActionsConnectorsBody onSelectConnector={onClose} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty
          iconType="arrowLeft"
          onClick={onClose}
          data-test-subj="ruleFlyoutSelectConnectorBackButton"
        >
          {RULE_FLYOUT_FOOTER_BACK_TEXT}
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </>
  );
};
