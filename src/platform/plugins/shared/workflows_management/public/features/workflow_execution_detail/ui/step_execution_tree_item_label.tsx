/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, euiFontSize, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { ExecutionStatus, isDangerousStatus } from '@kbn/workflows';
import { formatDuration } from '../../../shared/lib/format_duration';
import { getStatusLabel } from '../../../shared/translations';

export interface StepExecutionTreeItemLabelProps {
  stepId: string;
  status?: ExecutionStatus;
  executionTimeMs: number | null;
  selected: boolean;
  onClick?: React.MouseEventHandler;
}

export function StepExecutionTreeItemLabel({
  stepId,
  status,
  executionTimeMs,
  selected,
  onClick,
}: StepExecutionTreeItemLabelProps) {
  const styles = useMemoCss(componentStyles);
  // Trigger pseudo-steps are not real steps, they are used to display the trigger context
  const isTriggerPseudoStep = stepId === 'trigger';
  const isDangerous = status && isDangerousStatus(status);
  const isInactiveStatus = status === ExecutionStatus.SKIPPED || status === ExecutionStatus.PENDING;

  return (
    <EuiFlexGroup
      alignItems="baseline"
      gutterSize="xs"
      justifyContent="spaceBetween"
      responsive={false}
      css={styles.label}
      onClick={onClick}
    >
      <EuiFlexItem
        css={[
          styles.stepName,
          selected && styles.selectedStepName,
          isDangerous && styles.dangerousStepName,
          isInactiveStatus && styles.inactiveStepName,
        ]}
      >
        <span data-test-subj="workflowStepName">{stepId}</span>
        {status === ExecutionStatus.SKIPPED && (
          <>
            {' '}
            <span>{`(${getStatusLabel(status).toLowerCase()})`}</span>
          </>
        )}
      </EuiFlexItem>
      {executionTimeMs && !isTriggerPseudoStep && (
        <EuiFlexItem grow={false} css={[styles.duration, isDangerous && styles.durationDangerous]}>
          <EuiText size="xs" color="subdued">
            {formatDuration(executionTimeMs)}
          </EuiText>
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
  selectedStepName: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontWeight: 'bold',
      color: euiTheme.colors.textPrimary,
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
