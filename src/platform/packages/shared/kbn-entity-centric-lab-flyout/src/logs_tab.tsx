/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  type EuiBasicTableColumn,
  type Criteria,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { LogRow, LogSeverity } from './fake_entity_tabs';

interface LogsTabProps {
  readonly entityName: string;
  readonly logs: readonly LogRow[];
}

export const LogsTab = ({ entityName, logs }: LogsTabProps) => {
  const { euiTheme } = useEuiTheme();
  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 100 });
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(e.target.value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    []
  );

  const filteredLogs = useMemo(() => {
    if (!searchText.trim()) return logs;
    const lower = searchText.toLowerCase();
    return logs.filter(
      (row) =>
        row.summary.toLowerCase().includes(lower) ||
        row.attribute.toLowerCase().includes(lower) ||
        row.severity.toLowerCase().includes(lower)
    );
  }, [logs, searchText]);

  const pageOfItems = useMemo(
    () => filteredLogs.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [filteredLogs, pageIndex, pageSize]
  );

  const allPageSelected = pageOfItems.length > 0 && pageOfItems.every((r) => selectedIds.has(r.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const row of pageOfItems) next.delete(row.id);
      } else {
        for (const row of pageOfItems) next.add(row.id);
      }
      return next;
    });
  }, [allPageSelected, pageOfItems]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const columns = useMemo<Array<EuiBasicTableColumn<LogRow>>>(
    () => [
      {
        field: 'id',
        name: (
          <EuiCheckbox
            id="logs-select-all"
            checked={allPageSelected}
            onChange={toggleSelectAll}
            aria-label="Select all"
          />
        ),
        width: '32px',
        render: (id: string) => (
          <EuiCheckbox
            id={`logs-select-${id}`}
            checked={selectedIds.has(id)}
            onChange={() => toggleRow(id)}
            aria-label={`Select row ${id}`}
          />
        ),
      },
      {
        field: 'id',
        name: i18n.translate('entityCentricLabFlyout.flyout.logs.columns.actions', {
          defaultMessage: 'Actions',
        }),
        width: '80px',
        render: () => (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="Expand document">
                <EuiButtonIcon iconType="expand" color="text" size="xs" aria-label="Expand" />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="Filter for value">
                <EuiButtonIcon iconType="plusInCircle" color="text" size="xs" aria-label="Filter for" />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="Filter out value">
                <EuiButtonIcon iconType="minusInCircle" color="text" size="xs" aria-label="Filter out" />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'timestamp',
        name: i18n.translate('entityCentricLabFlyout.flyout.logs.columns.timestamp', {
          defaultMessage: '@timestamp',
        }),
        width: '200px',
        sortable: true,
        render: (timestamp: string) => (
          <EuiText size="s">{timestamp}</EuiText>
        ),
      },
      {
        field: 'summary',
        name: i18n.translate('entityCentricLabFlyout.flyout.logs.columns.summary', {
          defaultMessage: 'Summary',
        }),
        render: (_summary: string, row: LogRow) => (
          <EuiText size="s">
            <span
              css={css`
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              {row.attribute}
            </span>
            {' '}
            <SeverityInline severity={row.severity} />
            {' '}
            {row.summary}
          </EuiText>
        ),
      },
    ],
    [euiTheme.colors.textSubdued, allPageSelected, toggleSelectAll, selectedIds, toggleRow]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            fullWidth
            placeholder={i18n.translate('entityCentricLabFlyout.flyout.logs.searchPlaceholder', {
              defaultMessage: 'Search for log entries…',
            })}
            value={searchText}
            isClearable
            onChange={handleSearchChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" iconType="popout" iconSide="right" flush="both">
            {i18n.translate('entityCentricLabFlyout.flyout.logs.openInDiscover', {
              defaultMessage: 'Open in Discover',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('entityCentricLabFlyout.flyout.logs.documentCount', {
              defaultMessage: '{count} {count, plural, one {document} other {documents}}',
              values: { count: filteredLogs.length },
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" iconType="tableDensityExpanded">
                {i18n.translate('entityCentricLabFlyout.flyout.logs.columns', {
                  defaultMessage: 'Columns {count}',
                  values: { count: 2 },
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" iconType="sortable">
                {i18n.translate('entityCentricLabFlyout.flyout.logs.sortFields', {
                  defaultMessage: 'Sort fields {count}',
                  values: { count: 1 },
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
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
          totalItemCount: filteredLogs.length,
          pageSizeOptions: [25, 50, 100],
        }}
        onChange={({ page }: Criteria<LogRow>) => {
          if (page) {
            setPagination({ pageIndex: page.index, pageSize: page.size });
          }
        }}
        data-test-subj="entityCentricLabLogsTable"
      />
    </>
  );
};

const SEVERITY_BADGE_COLOR: Record<LogSeverity, string> = {
  Info: 'primary',
  Warning: 'warning',
  Error: 'danger',
};

const SeverityInline = ({ severity }: { readonly severity: LogSeverity }) => (
  <EuiBadge
    color={SEVERITY_BADGE_COLOR[severity]}
    css={css`
      font-size: 10px;
      line-height: 1;
      padding: 1px 4px;
      vertical-align: middle;
    `}
  >
    {severity.toLowerCase()}
  </EuiBadge>
);
