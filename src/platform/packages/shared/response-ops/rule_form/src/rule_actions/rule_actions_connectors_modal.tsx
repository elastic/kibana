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
import React, { useCallback } from 'react';
import { ACTION_TYPE_MODAL_TITLE } from '../translations';
import { RuleActionsConnectorsBody } from './rule_actions_connectors_body';
import { useRuleFormScreenContext } from '../hooks';

export const RuleActionsConnectorsModal = () => {
  const { euiTheme } = useEuiTheme();
  const currentBreakpoint = useCurrentEuiBreakpoint() ?? 'm';
  const isFullscreenPortrait = ['s', 'xs'].includes(currentBreakpoint);

  const responsiveHeight = isFullscreenPortrait ? 'initial' : '80vh';
  const responsiveOverflow = isFullscreenPortrait ? 'auto' : 'hidden';

  const { setIsConnectorsScreenVisible } = useRuleFormScreenContext();
  const onClose = useCallback(() => {
    setIsConnectorsScreenVisible(false);
  }, [setIsConnectorsScreenVisible]);

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
      aria-label={ACTION_TYPE_MODAL_TITLE}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle size="s">{ACTION_TYPE_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody className="actionConnectorModal__container">
        <RuleActionsConnectorsBody
          responsiveOverflow={responsiveOverflow}
          onSelectConnector={onClose}
        />
      </EuiModalBody>
    </EuiModal>
  );
};
