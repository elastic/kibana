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
import type { ExecutionStatus } from '@kbn/workflows';
import {
  getMaskableIconUrl,
  getStepIconType,
  getTriggerTypeIconType,
  HardcodedIcons,
  resolveRegisteredStepIcon,
} from '@kbn/workflows-ui';
import { useKibana } from '../../../hooks/use_kibana';
import { getExecutionStatusIcon } from '../status_badge';
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

    // Overview is a status-identity pseudo-step, not a type icon.
    if (stepType === '__overview' && executionStatus) {
      return getExecutionStatusIcon(euiTheme, executionStatus);
    }

    // Brand / step-type logos keep their own tokens. Status is signaled by the
    // tree label and row background, not by replacing or recoloring the logo.
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

    const maskUrl = getMaskableIconUrl(iconType);
    if (maskUrl) {
      return withTooltip(
        <span
          css={css`
            display: inline-block;
            width: 16px;
            height: 16px;
            mask-image: url('${maskUrl}');
            mask-size: contain;
            mask-repeat: no-repeat;
            mask-position: center;
            // Prefer an explicit caller-provided tint (e.g. graph accent), then
            // a neutral text tone. Do not tint with execution status color.
            background-color: ${iconColor ?? euiTheme.colors.textParagraph};
          `}
          onClick={onClick}
          aria-hidden={true}
        />,
        title
      );
    }

    if (typeof iconType === 'string' && iconType.startsWith('token')) {
      return withTooltip(
        <EuiToken iconType={iconType} size="s" fill="light" onClick={onClick} />,
        title
      );
    }

    return withTooltip(
      <EuiIcon type={iconType} size="m" onClick={onClick} {...rest} aria-hidden={true} />,
      title
    );
  }
);
StepIcon.displayName = 'StepIcon';
