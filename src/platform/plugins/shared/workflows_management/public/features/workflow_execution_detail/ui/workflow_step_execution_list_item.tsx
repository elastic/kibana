/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, euiFontSize, useEuiTheme } from '@elastic/eui';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { css } from '@emotion/react';
import { useFormattedDateTime } from '../../../shared/ui/use_formatted_date';
import { getExecutionStatusColors, getExecutionStatusIcon } from '../../../shared/ui/status_badge';

export interface WorkflowStepExecutionListItemProps {
  stepExecution: EsWorkflowStepExecution;
  selected: boolean;
  onClick: () => void;
}

export const WorkflowStepExecutionListItem = ({
  stepExecution,
  selected,
  onClick,
}: WorkflowStepExecutionListItemProps) => {
  const { euiTheme } = useEuiTheme();

  const formattedStartedAt = useFormattedDateTime(new Date(stepExecution.startedAt));

  const { color, backgroundColor } = getExecutionStatusColors(euiTheme, stepExecution.status);

  return (
    <EuiFlexGroup
      css={[
        componentStyles.container,
        !selected && componentStyles.containerSelectable,
        {
          borderColor: color,
          backgroundColor: selected ? backgroundColor : euiTheme.colors.backgroundBasePlain,
        },
      ]}
      alignItems="center"
      justifyContent="flexStart"
      onClick={onClick}
    >
      <EuiFlexItem css={componentStyles.statusIcon}>
        {getExecutionStatusIcon(euiTheme, stepExecution.status)}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" css={componentStyles.stepInfo}>
          <EuiFlexItem>
            <p css={{ color: euiTheme.colors.textSubdued }}>{formattedStartedAt}</p>
          </EuiFlexItem>
          <EuiFlexItem>
            <b>{stepExecution.stepId}</b>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const componentStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
      borderWidth: 1,
      borderStyle: 'solid',
      borderRadius: euiTheme.border.radius.medium,
      gap: euiTheme.size.m,
      flexGrow: 0,
    }),
  containerSelectable: ({ euiTheme }: UseEuiTheme) =>
    css({
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
      },
    }),
  statusIcon: ({ euiTheme }: UseEuiTheme) =>
    css({
      flexGrow: 0,
      width: '16px',
      height: '16px',
    }),
  stepInfo: (euiThemeContext: UseEuiTheme) =>
    css({
      gap: euiThemeContext.euiTheme.size.xs,
      flexGrow: 0,
      flexShrink: 1,
      fontSize: euiFontSize(euiThemeContext, 's').fontSize,
    }),
};
