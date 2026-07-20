/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { ChangeHistoryTrigger } from '@kbn/change-history-ui';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { WorkflowDetailEnabledSwitch } from './workflow_detail_enabled_switch';

type EnabledSwitchConfig = NonNullable<AppMenuConfig['switch']>;

export interface WorkflowDetailHeaderToolbarProps {
  switchConfig: EnabledSwitchConfig;
  showHistoryButton: boolean;
}

export const WorkflowDetailHeaderToolbar = ({
  switchConfig,
  showHistoryButton,
}: WorkflowDetailHeaderToolbarProps) => (
  <EuiFlexGroup
    alignItems="center"
    justifyContent="flexEnd"
    gutterSize="none"
    responsive={false}
    css={css`
      width: 100%;
      min-width: 0;
    `}
    data-test-subj="workflowDetailHeaderToolbar"
  >
    <EuiFlexItem grow={false}>
      <WorkflowDetailEnabledSwitch switchConfig={switchConfig} />
    </EuiFlexItem>
    {showHistoryButton && (
      <EuiFlexItem grow={false}>
        <ChangeHistoryTrigger data-test-subj="workflowDetailHistoryButton" />
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
