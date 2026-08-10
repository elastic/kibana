/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiIconProps, IconType } from '@elastic/eui';
import { EuiIcon, EuiLoadingSpinner, EuiToken, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { Suspense } from 'react';
import { ExecutionStatus } from '@kbn/workflows';
import {
  getStepIconType,
  getTriggerTypeIconType,
  HardcodedIcons,
  resolveRegisteredStepIcon,
} from '@kbn/workflows-ui';
import { useKibana } from '../../../hooks/use_kibana';
import { getExecutionStatusColors, getExecutionStatusIcon } from '../status_badge';
import { withTooltip } from '../with_tooltip';

// Category icons for bare base types (e.g. `ai.prompt` + `ai.agent` → `ai`) applied
// before extension-family inheritance, so the aggregated row icon stays stable
// regardless of which family members are registered or what icon they picked.
const BASE_TYPE_AGGREGATE_ICONS: Record<string, IconType> = {
  ai: 'productAgent',
  workflow: HardcodedIcons['workflow.execute'],
};

interface StepIconProps extends Omit<EuiIconProps, 'type'> {
  stepType: string;
  executionStatus: ExecutionStatus | null | undefined;
  onClick?: React.MouseEventHandler;
  /**
   * Explicit tint for mask-based (data-URI) icons, e.g. the graph node paints
   * the trigger icon accent/pink to match its border. Only affects masked icons;
   * multi-color logos are untouched. When omitted, masked icons use the neutral
   * text tone so the shared default stays consistent across all consumers.
   */
  iconColor?: string;
}

export const StepIcon = React.memo(
  ({ stepType, executionStatus, onClick, title, iconColor, ...rest }: StepIconProps) => {
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
    if (
      executionStatus === ExecutionStatus.WAITING_FOR_INPUT ||
      executionStatus === ExecutionStatus.WAITING_FOR_CHILD
    ) {
      return (
        <EuiIcon
          type="hourglass"
          size="m"
          color={getExecutionStatusColors(euiTheme, executionStatus).color}
          aria-hidden={true}
        />
      );
    }

    let iconType: IconType;
    if (stepType.startsWith('trigger_')) {
      iconType = getTriggerTypeIconType(stepType);
    } else if (BASE_TYPE_AGGREGATE_ICONS[stepType]) {
      iconType = BASE_TYPE_AGGREGATE_ICONS[stepType];
    } else {
      const registeredIcon = resolveRegisteredStepIcon(stepType, {
        workflowsExtensions,
        actionTypeRegistry,
      });
      if (registeredIcon) {
        return withTooltip(
          <Suspense fallback={<EuiLoadingSpinner size="s" />}>
            <EuiIcon type={registeredIcon} size="m" {...rest} aria-hidden={true} />
          </Suspense>,
          title
        );
      }

      iconType = getStepIconType(stepType);
    }

    if (typeof iconType === 'string' && iconType.startsWith('data:')) {
      const statusColor = shouldApplyColorToIcon
        ? getExecutionStatusColors(euiTheme, executionStatus).color
        : undefined;
      return withTooltip(
        <span
          css={css`
            display: inline-block;
            width: 16px;
            height: 16px;
            mask-image: url('${iconType}');
            mask-size: contain;
            mask-repeat: no-repeat;
            mask-position: center;
            // Tint precedence: execution-status color, then an explicit
            // caller-provided tint (e.g. the graph node's accent/pink), then a
            // neutral text tone so the shared default is consistent everywhere
            // StepIcon is used.
            background-color: ${statusColor ?? iconColor ?? euiTheme.colors.textParagraph};
          `}
          onClick={onClick}
          aria-hidden={true}
        />,
        title
      );
    }

    if (typeof iconType === 'string' && iconType.startsWith('token')) {
      return withTooltip(
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
        />,
        title
      );
    }

    return withTooltip(
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
        aria-hidden={true}
      />,
      title
    );
  }
);
StepIcon.displayName = 'StepIcon';
