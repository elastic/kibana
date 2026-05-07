/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiIconProps, IconType } from '@elastic/eui';
import { EuiIcon, EuiLoadingSpinner, EuiToken, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { Suspense } from 'react';
import type { TypeRegistry } from '@kbn/alerts-ui-shared/lib';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { ExecutionStatus } from '@kbn/workflows';
import type {
  PublicStepDefinition,
  WorkflowsExtensionsPublicPluginStart,
} from '@kbn/workflows-extensions/public';
import { getStepIconType, getTriggerTypeIconType } from './get_step_icon_type';
import { HardcodedIcons } from './hardcoded_icons';
import { useKibana } from '../../../hooks/use_kibana';
import { getExecutionStatusColors, getExecutionStatusIcon } from '../status_badge';

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
}

// EuiToolTip clones its child to attach hover handlers, so anchor it to a plain
// span — works uniformly for EuiIcon, EuiToken, Suspense, and the masked-span glyph.
const tooltipAnchorStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  lineHeight: 0,
});

const withTooltip = (content: React.ReactElement, title?: string): React.ReactElement =>
  title ? (
    <EuiToolTip content={title}>
      <span css={tooltipAnchorStyle}>{content}</span>
    </EuiToolTip>
  ) : (
    content
  );

export const StepIcon = React.memo(
  ({ stepType, executionStatus, onClick, title, ...rest }: StepIconProps) => {
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
      const stepDefinition =
        workflowsExtensions.getStepDefinition(stepType) ??
        findStepDefinitionByBaseType(stepType, workflowsExtensions);
      if (stepDefinition?.icon) {
        return withTooltip(
          <Suspense fallback={<EuiLoadingSpinner size="s" />}>
            <EuiIcon type={stepDefinition.icon} size="m" {...rest} aria-hidden={true} />
          </Suspense>,
          title
        );
      }

      const actionTypeIcon = getActionTypeIcon(stepType, actionTypeRegistry);
      if (actionTypeIcon) {
        return withTooltip(
          <Suspense fallback={<EuiLoadingSpinner size="s" />}>
            <EuiIcon type={actionTypeIcon} size="m" {...rest} aria-hidden={true} />
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
            background-color: ${statusColor ?? euiTheme.colors.textParagraph};
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

// List rows aggregate by base type (e.g. `cases` from `cases.createCase`), but extension steps
// register full ids (e.g. `cases.createCase`). Fall back to the first registered step whose id
// starts with `${baseType}.` so the list inherits the extension icon chosen for that family.
// Prefer a sibling that has an icon — some family members (e.g. `ai.agent`) intentionally omit
// one, and returning those here would drop the family back to the plugs fallback.
function findStepDefinitionByBaseType(
  baseType: string,
  workflowsExtensions: WorkflowsExtensionsPublicPluginStart
): PublicStepDefinition | undefined {
  const prefix = `${baseType}.`;
  const family = workflowsExtensions
    .getAllStepDefinitions()
    .filter((def) => def.id.startsWith(prefix));
  return family.find((def) => def.icon) ?? family[0];
}
