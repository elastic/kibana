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

/**
 * Aggregate icons for bare base types returned by `getBaseConnectorType` when the
 * workflow list collapses family members (e.g. `ai.prompt` + `ai.agent` → `ai`).
 *
 * Takes precedence over extension-family inheritance so the category icon stays
 * stable regardless of which members happen to be registered or what icons they
 * chose individually. Concretely: `ai` uses the EUI `productAgent` robot icon (the
 * AI family is thematic, not branded), and `workflow` uses the workflow.execute
 * glyph (no `workflow.*` step defs live in the extensions registry at all).
 */
const BASE_TYPE_AGGREGATE_ICONS: Record<string, IconType> = {
  ai: 'productAgent',
  workflow: HardcodedIcons['workflow.execute'],
};

interface StepIconProps extends Omit<EuiIconProps, 'type'> {
  stepType: string;
  executionStatus: ExecutionStatus | null | undefined;
  onClick?: React.MouseEventHandler;
}

/**
 * `EuiIcon` drops the `title` prop when its `type` is a React component (e.g. the
 * lazy-loaded connector icons), so a consumer that sets `title` on StepIcon
 * otherwise gets no tooltip. Wrapping the resolved icon in a span[title] covers
 * every rendering branch uniformly with the browser's native tooltip.
 */
const tooltipWrapperStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  lineHeight: 0,
});

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

    const withTooltip = (content: React.ReactElement): React.ReactElement =>
      title ? (
        <span title={title} css={tooltipWrapperStyle}>
          {content}
        </span>
      ) : (
        content
      );

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
          </Suspense>
        );
      }

      const actionTypeIcon = getActionTypeIcon(stepType, actionTypeRegistry);
      if (actionTypeIcon) {
        return withTooltip(
          <Suspense fallback={<EuiLoadingSpinner size="s" />}>
            <EuiIcon type={actionTypeIcon} size="m" {...rest} aria-hidden={true} />
          </Suspense>
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
        />
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
        />
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
