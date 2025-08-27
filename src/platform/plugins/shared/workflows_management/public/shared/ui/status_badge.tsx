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
  EuiIcon,
  EuiLoadingSpinner,
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
      color: euiTheme.colors.danger,
      backgroundColor: euiTheme.colors.backgroundBaseDanger,
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
  if (!status) {
    return <EuiBadge color="subdued">-</EuiBadge>;
  }

  const statusLabel = getStatusLabel(status);

  switch (status) {
    case 'completed':
      return <EuiBadge color="success">{statusLabel}</EuiBadge>;
    case 'failed':
      return <EuiBadge color="danger">{statusLabel}</EuiBadge>;
    case 'pending':
      return <EuiBadge color="subdued">{statusLabel}</EuiBadge>;
    case 'running':
      return (
        <EuiBadge color="subdued" iconType={() => <EuiLoadingSpinner size="s" />}>
          &nbsp;{statusLabel}
        </EuiBadge>
      );
    case 'waiting_for_input':
    case 'cancelled':
    case 'skipped':
    default:
      return <EuiBadge color="subdued">{statusLabel}</EuiBadge>;
  }
}
