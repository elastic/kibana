/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, euiFontSize } from '@elastic/eui';
import { ExecutionStatus, isDangerousStatus } from '@kbn/workflows';
import React from 'react';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { formatDuration } from '../../../shared/lib/format_duration';
import { getStatusLabel } from '../../../shared/translations';

export interface StepExecutionTreeItemLabelProps {
  stepId: string;
  status: ExecutionStatus | null;
  executionIndex: number;
  executionTimeMs: number | null;
  stepType: string;
  selected: boolean;
}

export function StepExecutionTreeItemLabel({
  stepId,
  status,
  executionIndex,
  executionTimeMs,
  stepType,
  selected,
}: StepExecutionTreeItemLabelProps) {
  const styles = useMemoCss(componentStyles);
  const isDangerous = status && isDangerousStatus(status);
  const isInactiveStatus = status === ExecutionStatus.SKIPPED || status === ExecutionStatus.PENDING;

  return (
    <EuiFlexGroup
      alignItems="baseline"
      gutterSize="xs"
      justifyContent="spaceBetween"
      responsive={false}
      css={styles.label}
    >
      <EuiFlexItem
        css={[
          styles.stepName,
          selected && styles.selectedStepName,
          isDangerous && styles.dangerousStepName,
          isInactiveStatus && styles.inactiveStepName,
        ]}
      >
        {stepId}
        {status === ExecutionStatus.SKIPPED && (
          <>
            {' '}
            <span>({getStatusLabel(status).toLowerCase()})</span>
          </>
        )}
      </EuiFlexItem>
      {executionTimeMs && (
        <EuiFlexItem grow={false} css={[styles.duration, isDangerous && styles.durationDangerous]}>
          {executionTimeMs ? formatDuration(executionTimeMs) : null}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

const componentStyles = {
  label: (euiThemeContext: UseEuiTheme) =>
    css({
      ...euiFontSize(euiThemeContext, 's'),
    }),
  stepName: css({
    display: 'block',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  }),
  selectedStepName: css({
    fontWeight: 'bold',
  }),
  dangerousStepName: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.danger,
    }),
  inactiveStepName: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textDisabled,
    }),
  duration: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textDisabled,
      paddingRight: euiTheme.size.xs,
    }),
  durationDangerous: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textDanger,
    }),
  executionIndex: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textDisabled,
      display: 'inline-block',
      marginLeft: euiTheme.size.xs,
    }),
};
