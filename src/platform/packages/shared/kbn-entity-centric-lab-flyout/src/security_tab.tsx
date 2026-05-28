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
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
  type Criteria,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SecurityIssue, SecuritySeverity, SecurityTabData } from './fake_entity_tabs';

interface SecurityTabProps {
  readonly security: SecurityTabData;
}

/**
 * Starting-point layout for the entity flyout's security tab — three stat
 * tiles at the top and a table of open security issues. Designed so we can
 * iterate from concrete content rather than another blank slate.
 */
export const SecurityTab = ({ security }: SecurityTabProps) => {
  const { euiTheme } = useEuiTheme();
  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const pageOfItems = useMemo(
    () => security.issues.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [security.issues, pageIndex, pageSize]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<SecurityIssue>>>(
    () => [
      {
        field: 'severity',
        name: i18n.translate('entityCentricLabFlyout.flyout.security.columns.severity', {
          defaultMessage: 'Severity',
        }),
        width: '110px',
        render: (severity: SecuritySeverity) => (
          <EuiBadge color={severityBadgeColor(severity)}>{severity}</EuiBadge>
        ),
      },
      {
        field: 'title',
        name: i18n.translate('entityCentricLabFlyout.flyout.security.columns.title', {
          defaultMessage: 'Title',
        }),
        render: (title: string) => (
          <EuiLink data-test-subj="entityCentricLabSecurityIssueLink">{title}</EuiLink>
        ),
      },
      {
        field: 'detectedAt',
        name: i18n.translate('entityCentricLabFlyout.flyout.security.columns.detected', {
          defaultMessage: 'Detected',
        }),
        sortable: true,
        width: '170px',
      },
      {
        field: 'source',
        name: i18n.translate('entityCentricLabFlyout.flyout.security.columns.source', {
          defaultMessage: 'Source',
        }),
        width: '140px',
        render: (source: string) => <EuiBadge color="hollow">{source}</EuiBadge>,
      },
      {
        field: 'status',
        name: i18n.translate('entityCentricLabFlyout.flyout.security.columns.status', {
          defaultMessage: 'Status',
        }),
        width: '110px',
        render: (status: SecurityIssue['status']) => (
          <EuiBadge color={statusBadgeColor(status)}>{status}</EuiBadge>
        ),
      },
    ],
    []
  );

  return (
    <>
      <EuiFlexGroup gutterSize="m" responsive={false} wrap>
        <EuiFlexItem style={{ minWidth: 160 }}>
          <SecurityStatPanel
            title={i18n.translate('entityCentricLabFlyout.flyout.security.riskScoreTitle', {
              defaultMessage: 'Risk score',
            })}
            value={
              <EuiFlexGroup alignItems="baseline" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText
                    css={css`
                      color: ${security.riskLevel === 'High'
                        ? euiTheme.colors.danger
                        : euiTheme.colors.textParagraph};
                      font-weight: ${euiTheme.font.weight.bold};
                      font-size: 36px;
                      line-height: 1;
                    `}
                  >
                    {security.riskScore}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    / 100
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            footer={
              <EuiBadge color={riskLevelBadgeColor(security.riskLevel)}>
                {security.riskLevel}
              </EuiBadge>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 160 }}>
          <SecurityStatPanel
            title={i18n.translate('entityCentricLabFlyout.flyout.security.openIssuesTitle', {
              defaultMessage: 'Open security issues',
            })}
            value={
              <EuiText
                css={css`
                  color: ${euiTheme.colors.danger};
                  font-weight: ${euiTheme.font.weight.bold};
                  font-size: 36px;
                  line-height: 1;
                `}
              >
                {security.issues.filter((issue) => issue.status === 'Open').length}
              </EuiText>
            }
            footer={
              <EuiText size="xs" color="subdued">
                {i18n.translate('entityCentricLabFlyout.flyout.security.openIssuesSubtitle', {
                  defaultMessage: 'across {total} tracked',
                  values: { total: security.issues.length },
                })}
              </EuiText>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 160 }}>
          <SecurityStatPanel
            title={i18n.translate('entityCentricLabFlyout.flyout.security.lastEventTitle', {
              defaultMessage: 'Last security event',
            })}
            value={
              <EuiText
                css={css`
                  font-weight: ${euiTheme.font.weight.bold};
                  font-size: 28px;
                  line-height: 1;
                `}
              >
                {security.lastEvent}
              </EuiText>
            }
            footer={
              <EuiText size="xs" color="subdued">
                {i18n.translate('entityCentricLabFlyout.flyout.security.lastEventSubtitle', {
                  defaultMessage: 'Time since last detection or finding.',
                })}
              </EuiText>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiPanel hasBorder hasShadow={false} paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('entityCentricLabFlyout.flyout.security.openIssuesTableTitle', {
              defaultMessage: 'Open security issues',
            })}
          </h3>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {i18n.translate('entityCentricLabFlyout.flyout.security.openIssuesTableSubtitle', {
            defaultMessage:
              'Findings, detections and vulnerabilities currently associated with this entity.',
          })}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiBasicTable<SecurityIssue>
          items={pageOfItems as SecurityIssue[]}
          columns={columns}
          tableCaption={i18n.translate(
            'entityCentricLabFlyout.flyout.security.openIssuesTableCaption',
            { defaultMessage: 'Open security issues' }
          )}
          pagination={{
            pageIndex,
            pageSize,
            totalItemCount: security.issues.length,
            pageSizeOptions: [10, 25, 50],
          }}
          onChange={({ page }: Criteria<SecurityIssue>) => {
            if (page) {
              setPagination({ pageIndex: page.index, pageSize: page.size });
            }
          }}
          data-test-subj="entityCentricLabSecurityIssuesTable"
        />
      </EuiPanel>
    </>
  );
};

const SecurityStatPanel = ({
  title,
  value,
  footer,
}: {
  readonly title: string;
  readonly value: React.ReactNode;
  readonly footer: React.ReactNode;
}) => (
  <EuiPanel hasBorder hasShadow={false} paddingSize="m">
    <EuiText size="xs" color="subdued">
      {title}
    </EuiText>
    <EuiSpacer size="s" />
    {value}
    <EuiSpacer size="s" />
    {footer}
  </EuiPanel>
);

const severityBadgeColor = (
  severity: SecuritySeverity
): 'danger' | 'warning' | 'primary' | 'hollow' => {
  switch (severity) {
    case 'Critical':
      return 'danger';
    case 'High':
      return 'warning';
    case 'Medium':
      return 'primary';
    case 'Low':
      return 'hollow';
  }
};

const statusBadgeColor = (status: SecurityIssue['status']): 'danger' | 'warning' | 'hollow' => {
  switch (status) {
    case 'Open':
      return 'danger';
    case 'Triaged':
      return 'warning';
    case 'Suppressed':
      return 'hollow';
  }
};

const riskLevelBadgeColor = (
  level: SecurityTabData['riskLevel']
): 'danger' | 'warning' | 'success' => {
  switch (level) {
    case 'High':
      return 'danger';
    case 'Medium':
      return 'warning';
    case 'Low':
      return 'success';
  }
};
