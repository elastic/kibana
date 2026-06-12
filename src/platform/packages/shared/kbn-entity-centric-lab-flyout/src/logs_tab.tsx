/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  type EuiBasicTableColumn,
  type Criteria,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LogRow, LogSeverity } from './fake_entity_tabs';

interface LogsTabProps {
  readonly entityName: string;
  readonly logs: readonly LogRow[];
}

export const LogsTab = ({ entityName, logs }: LogsTabProps) => {
  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 100 });

  const pageOfItems = useMemo(
    () => logs.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [logs, pageIndex, pageSize]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<LogRow>>>(
    () => [
      {
        field: 'id',
        name: <EuiIcon type="info" aria-hidden />,
        width: '32px',
        render: () => (
          <EuiButtonIcon
            iconType="expand"
            color="text"
            aria-label={i18n.translate('entityCentricLabFlyout.flyout.logs.expandRowAriaLabel', {
              defaultMessage: 'Expand row',
            })}
          />
        ),
      },
      {
        field: 'timestamp',
        name: (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.translate('entityCentricLabFlyout.flyout.logs.columns.timestamp', {
                defaultMessage: '@timestamp',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIcon type="clock" color="subdued" aria-hidden />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        width: '230px',
        sortable: true,
        render: (timestamp: string) => (
          <EuiText size="s">
            <strong>@timestamp</strong> {timestamp}
          </EuiText>
        ),
      },
      {
        field: 'severity',
        name: i18n.translate('entityCentricLabFlyout.flyout.logs.columns.severity', {
          defaultMessage: 'Severity',
        }),
        width: '110px',
        sortable: true,
        render: (severity: LogSeverity) => (
          <EuiBadge
            color={severityBadgeColor(severity)}
            data-test-subj={`entityCentricLabLogsSeverityBadge-${severity}`}
          >
            {severity}
          </EuiBadge>
        ),
      },
      {
        field: 'summary',
        name: (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.translate('entityCentricLabFlyout.flyout.logs.columns.summary', {
                defaultMessage: 'Summary',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate(
                  'entityCentricLabFlyout.flyout.logs.columns.summaryTooltip',
                  {
                    defaultMessage:
                      'A condensed view of the structured log entry — attributes and body text.',
                  }
                )}
                position="top"
                delay="long"
              >
                <EuiButtonIcon
                  iconType="question"
                  color="text"
                  aria-label={i18n.translate(
                    'entityCentricLabFlyout.flyout.logs.columns.summaryTooltipAriaLabel',
                    { defaultMessage: 'Show summary column description' }
                  )}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        render: (summary: string, row: LogRow) => (
          <EuiText size="s">
            <strong>{row.attribute}</strong> {summary}
          </EuiText>
        ),
      },
    ],
    []
  );

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('entityCentricLabFlyout.flyout.logs.panelTitle', {
            defaultMessage: 'Logs emitted by {entityName}',
            values: { entityName },
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiBasicTable<LogRow>
        items={pageOfItems as LogRow[]}
        columns={columns}
        tableCaption={i18n.translate('entityCentricLabFlyout.flyout.logs.tableCaption', {
          defaultMessage: 'Logs emitted by {entityName}',
          values: { entityName },
        })}
        pagination={{
          pageIndex,
          pageSize,
          totalItemCount: logs.length,
          pageSizeOptions: [25, 50, 100],
        }}
        onChange={({ page }: Criteria<LogRow>) => {
          if (page) {
            setPagination({ pageIndex: page.index, pageSize: page.size });
          }
        }}
        data-test-subj="entityCentricLabLogsTable"
      />
    </EuiPanel>
  );
};

// Per design: Info = green, Warning = yellow, Error = red — mapped to the EUI
// semantic badge colours so the palette stays aligned with the rest of the
// flyout (e.g. dependency health badges).
const severityBadgeColor = (severity: LogSeverity): 'success' | 'warning' | 'danger' => {
  switch (severity) {
    case 'Info':
      return 'success';
    case 'Warning':
      return 'warning';
    case 'Error':
      return 'danger';
  }
};
