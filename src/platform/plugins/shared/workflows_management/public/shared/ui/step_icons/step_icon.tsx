/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiIconProps, IconType } from '@elastic/eui';
import { EuiBeacon, EuiIcon, EuiLoadingSpinner, EuiToken, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { Suspense } from 'react';
import type { TypeRegistry } from '@kbn/alerts-ui-shared/lib';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { ExecutionStatus } from '@kbn/workflows';
import { getStepIconType } from './get_step_icon_type';
import { useKibana } from '../../../hooks/use_kibana';
import { getExecutionStatusColors, getExecutionStatusIcon } from '../status_badge';

interface StepIconProps extends Omit<EuiIconProps, 'type'> {
  stepType: string;
  executionStatus: ExecutionStatus | null | undefined;
  onClick?: React.MouseEventHandler;
}

export const StepIcon = React.memo(
  ({ stepType, executionStatus, onClick, ...rest }: StepIconProps) => {
    const { euiTheme } = useEuiTheme();
    const { triggersActionsUi, workflowsExtensions } = useKibana().services;
    const { actionTypeRegistry } = triggersActionsUi;

    // For Overview pseudo-step, show the execution status icon
    if (stepType === '__overview' && executionStatus) {
      return getExecutionStatusIcon(euiTheme, executionStatus);
    }

    const shouldApplyColorToIcon = executionStatus !== undefined;
    if (executionStatus === ExecutionStatus.RUNNING) {
      return <EuiLoadingSpinner size="m" />;
    }
    if (executionStatus === ExecutionStatus.WAITING_FOR_INPUT) {
      return <EuiBeacon size={14} color="warning" />;
    }

    const actionTypeIcon = getActionTypeIcon(stepType, actionTypeRegistry);
    if (actionTypeIcon) {
      return (
        <Suspense fallback={<EuiLoadingSpinner size="s" />}>
          <EuiIcon type={actionTypeIcon} size="m" />
        </Suspense>
      );
    }

    const stepDefinition = workflowsExtensions.getStepDefinition(stepType);
    if (stepDefinition?.icon) {
      return (
        <Suspense fallback={<EuiLoadingSpinner size="s" />}>
          <EuiIcon type={stepDefinition.icon} size="m" />
        </Suspense>
      );
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
);
StepIcon.displayName = 'StepIcon';

// stepType is in the format of `.actionTypeId.actionTypeSubtype`
function getActionTypeIcon(
  stepType: string,
  actionTypeRegistry: TypeRegistry<ActionTypeModel>
): IconType | undefined {
  const action = stepType.startsWith('.') ? stepType.slice(1) : stepType;
  const [actionTypeId] = action.split('.');
  if (actionTypeRegistry.has(`.${actionTypeId}`)) {
    const actionType = actionTypeRegistry.get(`.${actionTypeId}`);
    return actionType.iconClass;
  }
  return undefined;
}
