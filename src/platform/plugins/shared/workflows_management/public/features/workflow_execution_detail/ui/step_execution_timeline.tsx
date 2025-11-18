/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiIcon,
  EuiText,
  EuiTimeline,
  type EuiTimelineProps,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import React, { useMemo } from 'react';
import type { WorkflowExecutionLogEntry } from '../../../entities/workflows/api/use_workflow_execution_logs';
import { useGetFormattedDateTime } from '../../../shared/ui/use_formatted_date';

export const StepExecutionTimeline = ({
  logs,
  backgroundColor: _backgroundColor,
}: {
  logs: WorkflowExecutionLogEntry[];
  backgroundColor?: string;
}) => {
  const getFormattedDateTime = useGetFormattedDateTime();
  const { euiTheme } = useEuiTheme();
  const backgroundColor = _backgroundColor ?? euiTheme.colors.backgroundBasePlain;
  const items: EuiTimelineProps['items'] = useMemo(() => {
    return logs.map((log) => {
      let iconType: EuiIconType = 'info';
      let icon = (
        <EuiIcon
          type={iconType}
          color="subdued"
          css={{
            backgroundColor,
            borderRadius: euiTheme.border.radius.medium,
          }}
        />
      );
      if (log.level === 'error') {
        iconType = 'error';
        icon = (
          <EuiIcon
            type={iconType}
            color="danger"
            css={{
              backgroundColor,
              borderRadius: euiTheme.border.radius.medium,
            }}
          />
        );
      }
      if (log.level === 'warn') {
        iconType = 'warning';
        icon = (
          <EuiIcon
            type={iconType}
            color="warning"
            css={{
              backgroundColor,
              borderRadius: euiTheme.border.radius.medium,
            }}
          />
        );
      }
      return {
        children: (
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiText size="xs">{getFormattedDateTime(new Date(log.timestamp))}</EuiText>
            <EuiText size="s">{log.message}</EuiText>
          </EuiFlexGroup>
        ),
        verticalAlign: 'top',
        icon,
      };
    });
  }, [backgroundColor, euiTheme.border.radius.medium, getFormattedDateTime, logs]);
  return <EuiTimeline items={items} gutterSize="m" />;
};
