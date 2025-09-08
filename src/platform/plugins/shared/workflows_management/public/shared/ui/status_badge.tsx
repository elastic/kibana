/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiBeacon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
  type EuiThemeComputed,
} from '@elastic/eui';
import { ExecutionStatus } from '@kbn/workflows';
import React from 'react';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { getStatusLabel } from '../translations';

interface ExecutionStatusColors {
  color: string;
  backgroundColor: string;
}

const getExecutionStatusColorsMap = (
  euiTheme: EuiThemeComputed
): Record<ExecutionStatus, ExecutionStatusColors> => {
  return {
    [ExecutionStatus.COMPLETED]: {
      color: euiTheme.colors.vis.euiColorVisSuccess0,
      backgroundColor: euiTheme.colors.backgroundBaseSuccess,
    },
    [ExecutionStatus.FAILED]: {
      color: euiTheme.colors.danger,
      backgroundColor: euiTheme.colors.backgroundBaseDanger,
    },
    [ExecutionStatus.PENDING]: {
      color: euiTheme.colors.textSubdued,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    },
    [ExecutionStatus.RUNNING]: {
      color: euiTheme.colors.textSubdued,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    },
    [ExecutionStatus.WAITING]: {
      color: euiTheme.colors.warning,
      backgroundColor: euiTheme.colors.backgroundBaseWarning,
    },
    [ExecutionStatus.WAITING_FOR_INPUT]: {
      color: euiTheme.colors.warning,
      backgroundColor: euiTheme.colors.backgroundBaseWarning,
    },
    [ExecutionStatus.CANCELLED]: {
      color: euiTheme.colors.textSubdued,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    },
    [ExecutionStatus.SKIPPED]: {
      color: euiTheme.colors.textSubdued,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    },
  };
};

export const getExecutionStatusColors = (euiTheme: EuiThemeComputed, status: ExecutionStatus) => {
  return getExecutionStatusColorsMap(euiTheme)[status];
};

const ExecutionStatusIconTypeMap: Record<ExecutionStatus, EuiIconType> = {
  [ExecutionStatus.COMPLETED]: 'checkInCircleFilled',
  [ExecutionStatus.FAILED]: 'errorFilled',
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

export function StatusBadge({ status }: { status: ExecutionStatus | undefined }) {
  const { euiTheme } = useEuiTheme();
  if (!status) {
    return <EuiBadge color="subdued">-</EuiBadge>;
  }

  const statusLabel = getStatusLabel(status);
  const icon = getExecutionStatusIcon(euiTheme, status);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
      <EuiFlexItem grow={false} className="eui-hideFor--s">
        <EuiText size="s">{statusLabel}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
