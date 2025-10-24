/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, EuiLoadingSpinner, EuiBeacon, EuiToken, EuiIcon } from '@elastic/eui';
import { ExecutionStatus } from '@kbn/workflows';
import React from 'react';
import { css } from '@emotion/react';
import { getStackConnectorLogoLazy } from '@kbn/stack-connectors-plugin/public/common/logos';
import { getStepIconType } from './get_step_icon_type';
import { getExecutionStatusColors } from '../status_badge';

export function StepIcon({
  stepType,
  executionStatus,
}: {
  stepType: string;
  executionStatus: ExecutionStatus | null;
}) {
  const { euiTheme } = useEuiTheme();
  if (executionStatus === ExecutionStatus.RUNNING) {
    return <EuiLoadingSpinner size="m" />;
  }
  if (executionStatus === ExecutionStatus.WAITING_FOR_INPUT) {
    return <EuiBeacon size={14} color="warning" />;
  }
  const stackConnectorIconComponent = getStackConnectorIcon(stepType);
  if (stackConnectorIconComponent) {
    return <EuiIcon type={stackConnectorIconComponent} size="m" />;
  }
  const iconType = getStepIconType(stepType);
  if (iconType.startsWith('token')) {
    return (
      <EuiToken
        iconType={iconType}
        size="s"
        color={getExecutionStatusColors(euiTheme, executionStatus).tokenColor}
        fill="light"
      />
    );
  }
  return (
    <EuiIcon
      type={iconType}
      size="m"
      color={getExecutionStatusColors(euiTheme, executionStatus).color}
      css={
        // change fill and color of the icon for non-completed statuses, for multi-color logos
        executionStatus !== ExecutionStatus.COMPLETED &&
        css`
          & * {
            fill: ${getExecutionStatusColors(euiTheme, executionStatus).color};
            color: ${getExecutionStatusColors(euiTheme, executionStatus).color};
          }
        `
      }
    />
  );
}

function getStackConnectorIcon(connectorType: string) {
  const dotConnectorType = `.${connectorType}`;

  return getStackConnectorLogoLazy(dotConnectorType);
}
