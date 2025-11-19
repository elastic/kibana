/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiIconProps } from '@elastic/eui';
import { EuiBeacon, EuiIcon, EuiLoadingSpinner, EuiToken, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { getStackConnectorLogoLazy } from '@kbn/stack-connectors-plugin/public/common/logos';
import { ExecutionStatus } from '@kbn/workflows';
import { getStepIconType } from './get_step_icon_type';
import { getExecutionStatusColors } from '../status_badge';

interface StepIconProps extends Omit<EuiIconProps, 'type'> {
  stepType: string;
  executionStatus: ExecutionStatus | null | undefined;
  onClick?: React.MouseEventHandler;
}

export function StepIcon({ stepType, executionStatus, onClick, ...rest }: StepIconProps) {
  const { euiTheme } = useEuiTheme();
  const shouldApplyColorToIcon = executionStatus !== undefined;
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
        color={
          shouldApplyColorToIcon
            ? getExecutionStatusColors(euiTheme, executionStatus).tokenColor
            : undefined
        }
        fill="light"
        onClick={onClick}
      />
    );
  }
  return (
    <EuiIcon
      type={iconType}
      size="m"
      color={
        shouldApplyColorToIcon
          ? getExecutionStatusColors(euiTheme, executionStatus).color
          : undefined
      }
      css={
        // change fill and color of the icon for non-completed statuses, for multi-color logos
        shouldApplyColorToIcon &&
        executionStatus !== ExecutionStatus.COMPLETED &&
        css`
          & * {
            fill: ${getExecutionStatusColors(euiTheme, executionStatus).color};
            color: ${getExecutionStatusColors(euiTheme, executionStatus).color};
          }
        `
      }
      onClick={onClick}
      {...rest}
    />
  );
}

function getStackConnectorIcon(connectorType: string) {
  const dotConnectorType = `.${connectorType}`;

  return getStackConnectorLogoLazy(dotConnectorType);
}
