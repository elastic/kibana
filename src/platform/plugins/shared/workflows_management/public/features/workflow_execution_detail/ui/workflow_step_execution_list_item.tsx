/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { useFormattedDateTime } from '../../../shared/ui/use_formatted_date';
import { getExecutionStatusColor, getExecutionStatusIcon } from '../../../shared/ui/status_badge';

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

  return (
    <EuiFlexGroup
      css={{
        padding: euiTheme.size.m,
        backgroundColor: selected
          ? euiTheme.colors.backgroundBaseInteractiveSelect
          : euiTheme.colors.backgroundBasePlain,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: getExecutionStatusColor(euiTheme, stepExecution.status),
        borderRadius: euiTheme.border.radius.medium,
        gap: euiTheme.size.m,
        flexGrow: 0,
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
        },
      }}
      alignItems="center"
      justifyContent="flexStart"
      onClick={onClick}
    >
      <EuiFlexItem css={{ flexGrow: 0, width: '16px', height: '16px' }}>
        {getExecutionStatusIcon(euiTheme, stepExecution.status)}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup
          direction="column"
          css={{
            gap: euiTheme.size.xs,
            flexGrow: 0,
            flexShrink: 1,
            fontSize: useEuiFontSize('s').fontSize,
          }}
        >
          <EuiFlexItem>
            <p css={{ color: euiTheme.colors.textSubdued }}>{formattedStartedAt}</p>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText css={{ fontWeight: 'bold' }}>{stepExecution.stepId}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
