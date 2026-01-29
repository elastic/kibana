/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBeacon,
  EuiFlexGroup,
  type EuiFlexGroupProps,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  type EuiTextProps,
  type EuiThemeComputed,
  EuiToolTip,
  formatDate,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import type { TokenColor } from '@elastic/eui/src/components/token/token_types';
import { css } from '@emotion/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';
import { FormattedRelativeEnhanced } from './formatted_relative_enhanced/formatted_relative_enhanced';
import { getStatusLabel } from '../translations';
interface ExecutionStatusColors {
  color: string;
  backgroundColor: string;
  tokenColor: TokenColor | undefined;
}

const getExecutionStatusColorsMap = (
  euiTheme: EuiThemeComputed
): Record<ExecutionStatus, ExecutionStatusColors> => {
  return {
    [ExecutionStatus.COMPLETED]: {
      color: euiTheme.colors.vis.euiColorVisSuccess0,
      backgroundColor: euiTheme.colors.backgroundBaseSuccess,
      tokenColor: 'euiColorVis0' as const,
    },
    [ExecutionStatus.FAILED]: {
      color: euiTheme.colors.danger,
      backgroundColor: euiTheme.colors.backgroundBaseDanger,
      tokenColor: 'euiColorVis6' as const,
    },
    [ExecutionStatus.PENDING]: {
      color: euiTheme.colors.textSubdued,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      tokenColor: 'gray' as const,
    },
    [ExecutionStatus.RUNNING]: {
      color: euiTheme.colors.textSubdued,
      backgroundColor: euiTheme.colors.backgroundLightNeutral,
      tokenColor: 'euiColorVis3' as const,
    },
    [ExecutionStatus.WAITING]: {
      color: euiTheme.colors.warning,
      backgroundColor: euiTheme.colors.backgroundBaseWarning,
      tokenColor: 'euiColorVis9' as const,
    },
    [ExecutionStatus.WAITING_FOR_INPUT]: {
      color: euiTheme.colors.warning,
      backgroundColor: euiTheme.colors.backgroundBaseWarning,
      tokenColor: 'euiColorVis9' as const,
    },
    [ExecutionStatus.CANCELLED]: {
      color: euiTheme.colors.textSubdued,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      tokenColor: 'gray',
    },
    [ExecutionStatus.TIMED_OUT]: {
      color: euiTheme.colors.danger,
      backgroundColor: euiTheme.colors.backgroundBaseDanger,
      tokenColor: 'euiColorVis6' as const,
    },
    [ExecutionStatus.SKIPPED]: {
      color: euiTheme.colors.textDisabled,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      tokenColor: 'gray',
    },
  };
};

export const getExecutionStatusColors = (
  euiTheme: EuiThemeComputed,
  status: ExecutionStatus | null
) => {
  if (!status) {
    return {
      color: euiTheme.colors.textSubdued,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      tokenColor: 'gray',
    };
  }
  return getExecutionStatusColorsMap(euiTheme)[status];
};

const ExecutionStatusIconTypeMap: Record<ExecutionStatus, EuiIconType> = {
  [ExecutionStatus.COMPLETED]: 'checkInCircleFilled',
  [ExecutionStatus.FAILED]: 'errorFilled',
  [ExecutionStatus.TIMED_OUT]: 'errorFilled',
  [ExecutionStatus.PENDING]: 'clock',
  [ExecutionStatus.RUNNING]: 'play',
  [ExecutionStatus.WAITING]: 'clock',
  [ExecutionStatus.WAITING_FOR_INPUT]: 'dot',
  [ExecutionStatus.CANCELLED]: 'crossInCircle',
  [ExecutionStatus.SKIPPED]: 'minusInCircleFilled',
};

export const getExecutionStatusIcon = (euiTheme: EuiThemeComputed, status: ExecutionStatus) => {
  if (status === ExecutionStatus.RUNNING) {
    return <EuiLoadingSpinner size="m" />;
  }

  if (status === ExecutionStatus.WAITING_FOR_INPUT) {
    return <EuiBeacon size={14} color="warning" />;
  }

  return (
    <EuiIcon
      type={ExecutionStatusIconTypeMap[status]}
      color={getExecutionStatusColors(euiTheme, status).color}
    />
  );
};

export function StatusBadge({
  status,
  date,
  textProps,
  ...props
}: {
  status: ExecutionStatus | undefined;
  date?: string | undefined;
  textProps?: EuiTextProps;
} & EuiFlexGroupProps) {
  const { euiTheme } = useEuiTheme();
  if (!status) return;

  const statusLabel = getStatusLabel(status);
  const icon = getExecutionStatusIcon(euiTheme, status);

  return (
    <EuiToolTip content={date ? `${statusLabel} ${date ? `on ${formatDate(date)}` : ''}` : null}>
      <EuiFlexGroup alignItems="center" gutterSize="s" {...props}>
        <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
        <EuiFlexItem grow={false} className="eui-hideFor--s">
          <EuiText
            size="s"
            {...textProps}
            css={css`::first-letter {
              text-transform: capitalize;
            `}
          >
            {date ? <FormattedRelativeEnhanced value={date} /> : statusLabel}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
}
