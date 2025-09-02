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
import { ExecutionStatus, type EsWorkflowStepExecution } from '@kbn/workflows';
import React from 'react';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { formatDuration } from '../../../shared/lib/format_duration';

export interface StepExecutionTreeItemLabelProps {
  stepExecution: EsWorkflowStepExecution;
  stepType: string;
  selected: boolean;
}

export function StepExecutionTreeItemLabel({
  stepExecution,
  stepType,
  selected,
}: StepExecutionTreeItemLabelProps) {
  const styles = useMemoCss(componentStyles);
  const duration = stepExecution.completedAt
    ? new Date(stepExecution.completedAt).getTime() - new Date(stepExecution.startedAt).getTime()
    : null;
  const isDangerousStatus =
    stepExecution.status === ExecutionStatus.FAILED ||
    stepExecution.status === ExecutionStatus.CANCELLED;
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
          isDangerousStatus && styles.dangerousStepName,
        ]}
      >
        {/* {stepType} */}
        {stepExecution.stepId}
        {stepExecution.executionIndex > 0 && (
          <span css={styles.executionIndex}>{stepExecution.executionIndex + 1}</span>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={styles.duration}>
        {duration ? formatDuration(duration) : null}
      </EuiFlexItem>
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
  duration: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textDisabled,
    }),
  executionIndex: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textDisabled,
      display: 'inline-block',
      marginLeft: euiTheme.size.xs,
    }),
};
