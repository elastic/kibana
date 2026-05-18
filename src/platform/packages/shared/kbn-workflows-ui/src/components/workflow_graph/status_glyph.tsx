/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, EuiLoadingSpinner, EuiScreenReaderOnly, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ExecutionStatus } from '@kbn/workflows';
import { getExecutionStatusVisual } from './get_execution_status_color';

function getStatusLabel(status: ExecutionStatus): string {
  switch (status) {
    case ExecutionStatus.COMPLETED:
      return i18n.translate('workflowsUi.executionStatus.completed', {
        defaultMessage: 'Completed',
      });
    case ExecutionStatus.FAILED:
      return i18n.translate('workflowsUi.executionStatus.failed', { defaultMessage: 'Failed' });
    case ExecutionStatus.TIMED_OUT:
      return i18n.translate('workflowsUi.executionStatus.timedOut', {
        defaultMessage: 'Timed out',
      });
    case ExecutionStatus.RUNNING:
      return i18n.translate('workflowsUi.executionStatus.running', { defaultMessage: 'Running' });
    case ExecutionStatus.SKIPPED:
      return i18n.translate('workflowsUi.executionStatus.skipped', { defaultMessage: 'Skipped' });
    case ExecutionStatus.WAITING:
      return i18n.translate('workflowsUi.executionStatus.waiting', { defaultMessage: 'Waiting' });
    case ExecutionStatus.WAITING_FOR_INPUT:
      return i18n.translate('workflowsUi.executionStatus.waitingForInput', {
        defaultMessage: 'Waiting for input',
      });
    case ExecutionStatus.CANCELLED:
      return i18n.translate('workflowsUi.executionStatus.cancelled', {
        defaultMessage: 'Cancelled',
      });
    case ExecutionStatus.PENDING:
      return i18n.translate('workflowsUi.executionStatus.pending', { defaultMessage: 'Pending' });
    default:
      return String(status);
  }
}

export function StatusGlyph({ status }: { status: ExecutionStatus | null | undefined }) {
  const { euiTheme } = useEuiTheme();
  if (!status) return null;
  const visual = getExecutionStatusVisual(euiTheme, status);
  const label = getStatusLabel(status);
  return (
    <span
      aria-label={label}
      role="img"
      css={{
        position: 'absolute',
        top: -6,
        right: -6,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: euiTheme.colors.backgroundBasePlain,
        border: `1px solid ${visual.color}`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      }}
    >
      {visual.isSpinner ? (
        <EuiLoadingSpinner size="s" />
      ) : (
        <EuiIcon type={visual.iconType} color={visual.color} size="s" />
      )}
      <EuiScreenReaderOnly>
        <span>{label}</span>
      </EuiScreenReaderOnly>
    </span>
  );
}
