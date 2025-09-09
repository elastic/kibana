/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import type { ExecutionStatus } from '@kbn/workflows';
import React from 'react';
import { FormattedRelative } from '@kbn/i18n-react';
import { useFormattedDateTime } from '../../../shared/ui/use_formatted_date';
import { getStatusLabel } from '../../../shared/translations';
import { getExecutionStatusIcon } from '../../../shared/ui/status_badge';

interface WorkflowExecutionListItemProps {
  status: ExecutionStatus;
  startedAt: Date;
  selected: boolean;
  onClick: () => void;
  // TODO: add duration, triggeredBy, finishedAt, etc.?
}

export const WorkflowExecutionListItem = ({
  status,
  startedAt,
  selected = false,
  onClick,
}: WorkflowExecutionListItemProps) => {
  const { euiTheme } = useEuiTheme();

  const formattedDate = useFormattedDateTime(startedAt);

  return (
    <EuiFlexGroup
      css={{
        padding: euiTheme.size.m,
        backgroundColor: selected
          ? euiTheme.colors.backgroundBaseInteractiveSelect
          : euiTheme.colors.backgroundBasePlain,
        borderRadius: euiTheme.border.radius.medium,
        gap: euiTheme.size.m,
        flexGrow: 0,
        '&:hover': !selected && {
          backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
          cursor: 'pointer',
        },
      }}
      alignItems="center"
      justifyContent="flexStart"
      onClick={onClick}
      responsive={false}
    >
      <EuiFlexItem css={{ flexGrow: 0, width: '16px', height: '16px' }}>
        {getExecutionStatusIcon(euiTheme, status)}
      </EuiFlexItem>
      <EuiFlexItem css={{ flex: 1 }}>
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
            <p css={{ fontWeight: 500 }}>{getStatusLabel(status)}</p>
          </EuiFlexItem>
          <EuiFlexItem css={{ alignSelf: 'flex-start' }}>
            <EuiToolTip position="right" content={formattedDate}>
              <FormattedRelative value={startedAt} />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
