/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useCurrentEuiBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import { ActionConnector } from '@kbn/alerts-ui-shared';
import React from 'react';
import { ACTION_TYPE_MODAL_TITLE } from '../translations';
import { RuleActionsConnectorsBody } from './rule_actions_connectors_body';

export interface RuleActionsConnectorsModalProps {
  onClose: () => void;
  onSelectConnector: (connector: ActionConnector) => void;
}

export const RuleActionsConnectorsModal = (props: RuleActionsConnectorsModalProps) => {
  const { onClose, onSelectConnector } = props;

  const { euiTheme } = useEuiTheme();
  const currentBreakpoint = useCurrentEuiBreakpoint() ?? 'm';
  const isFullscreenPortrait = ['s', 'xs'].includes(currentBreakpoint);

  const responsiveHeight = isFullscreenPortrait ? 'initial' : '80vh';
  const responsiveOverflow = isFullscreenPortrait ? 'auto' : 'hidden';

  return (
    <EuiModal
      onClose={onClose}
      maxWidth={euiTheme.breakpoint[currentBreakpoint]}
      style={{
        width: euiTheme.breakpoint[currentBreakpoint],
        maxHeight: responsiveHeight,
        height: responsiveHeight,
        overflow: responsiveOverflow,
      }}
      data-test-subj="ruleActionsConnectorsModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle size="s">{ACTION_TYPE_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody className="actionConnectorModal__container">
        <RuleActionsConnectorsBody
          onSelectConnector={onSelectConnector}
          responsiveOverflow={responsiveOverflow}
        />
      </EuiModalBody>
    </EuiModal>
  );
};
