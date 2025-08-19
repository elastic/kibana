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

const getExecutionStatusColorMap = (
  euiTheme: EuiThemeComputed
): Record<ExecutionStatus, string> => {
  return {
    [ExecutionStatus.COMPLETED]: euiTheme.colors.vis.euiColorVis0,
    [ExecutionStatus.FAILED]: euiTheme.colors.danger,
    [ExecutionStatus.PENDING]: euiTheme.colors.textSubdued,
    [ExecutionStatus.RUNNING]: euiTheme.colors.borderBaseSubdued,
    [ExecutionStatus.WAITING_FOR_INPUT]: euiTheme.colors.warning,
    [ExecutionStatus.CANCELLED]: euiTheme.colors.danger,
    [ExecutionStatus.SKIPPED]: euiTheme.colors.textSubdued,
  };
};

export const getExecutionStatusColor = (euiTheme: EuiThemeComputed, status: ExecutionStatus) => {
  return getExecutionStatusColorMap(euiTheme)[status];
};

const ExecutionStatusIconTypeMap: Record<ExecutionStatus, EuiIconType> = {
  [ExecutionStatus.COMPLETED]: 'checkInCircleFilled',
  [ExecutionStatus.FAILED]: 'errorFilled',
  [ExecutionStatus.PENDING]: 'clock',
  [ExecutionStatus.RUNNING]: 'play',
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
      color={getExecutionStatusColor(euiTheme, status)}
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
