/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiProgress,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SloRow, SloStatus, SlosTabData } from './fake_entity_tabs';

interface SlosTabProps {
  readonly slos: SlosTabData;
}

const SLO_STATUS_COLOR: Record<SloStatus, string> = {
  Met: 'success',
  Breaching: 'danger',
  Degrading: 'warning',
  'No data': 'hollow',
};

const BUDGET_BAR_COLOR: Record<SloStatus, 'success' | 'warning' | 'danger' | 'subdued'> = {
  Met: 'success',
  Breaching: 'danger',
  Degrading: 'warning',
  'No data': 'subdued',
};

export const SlosTab = ({ slos }: SlosTabProps) => {
  const columns = useMemo<Array<EuiBasicTableColumn<SloRow>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('entityCentricLabFlyout.flyout.slos.columns.name', {
          defaultMessage: 'SLO',
        }),
        truncateText: true,
        render: (name: string) => (
          <EuiLink data-test-subj="entityCentricLabSloLink">{name}</EuiLink>
        ),
      },
      {
        field: 'target',
        name: i18n.translate('entityCentricLabFlyout.flyout.slos.columns.target', {
          defaultMessage: 'Target',
        }),
        width: '80px',
      },
      {
        field: 'current',
        name: i18n.translate('entityCentricLabFlyout.flyout.slos.columns.current', {
          defaultMessage: 'Current',
        }),
        width: '80px',
        render: (current: string, row: SloRow) => (
          <EuiText
            size="s"
            css={css`
              font-weight: 600;
              color: ${row.status === 'Met'
                ? 'inherit'
                : row.status === 'Degrading'
                ? 'var(--euiColorWarningText, #b5a642)'
                : 'var(--euiColorDangerText, #bd271e)'};
            `}
          >
            {current}
          </EuiText>
        ),
      },
      {
        field: 'status',
        name: i18n.translate('entityCentricLabFlyout.flyout.slos.columns.status', {
          defaultMessage: 'Status',
        }),
        width: '95px',
        render: (status: SloStatus) => (
          <EuiBadge color={SLO_STATUS_COLOR[status]}>{status}</EuiBadge>
        ),
      },
      {
        field: 'budgetRemaining',
        name: i18n.translate('entityCentricLabFlyout.flyout.slos.columns.budget', {
          defaultMessage: 'Budget',
        }),
        width: '110px',
        render: (budgetRemaining: number, row: SloRow) => {
          const clamped = Math.max(0, Math.min(100, budgetRemaining));
          return (
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false} css={css`min-width: 42px; text-align: right;`}>
                <EuiText size="xs">
                  {budgetRemaining > 0 ? `${budgetRemaining}%` : '0%'}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiProgress
                  value={clamped}
                  max={100}
                  size="s"
                  color={BUDGET_BAR_COLOR[row.status]}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
    ],
    []
  );

  if (slos.slos.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="visGauge"
        title={
          <h2>
            {i18n.translate('entityCentricLabFlyout.flyout.slos.empty.title', {
              defaultMessage: 'No SLOs defined',
            })}
          </h2>
        }
        body={
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('entityCentricLabFlyout.flyout.slos.empty.body', {
                defaultMessage:
                  'Service Level Objectives help you track reliability targets for this resource. Create an SLO to start monitoring availability, latency, or error rate against a target.',
              })}
            </p>
          </EuiText>
        }
      />
    );
  }

  const breachingCount = slos.slos.filter((s) => s.status === 'Breaching').length;
  const degradingCount = slos.slos.filter((s) => s.status === 'Degrading').length;

  return (
    <>
      <EuiFlexGroup gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiPanel hasBorder hasShadow={false} paddingSize="m">
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="visGauge" size="l" color="subdued" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('entityCentricLabFlyout.flyout.slos.stats.total', {
                    defaultMessage: 'Total SLOs',
                  })}
                </EuiText>
                <EuiTitle size="s">
                  <span>{slos.slos.length}</span>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder hasShadow={false} paddingSize="m">
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="error" size="l" color={breachingCount > 0 ? 'danger' : 'subdued'} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('entityCentricLabFlyout.flyout.slos.stats.breaching', {
                    defaultMessage: 'Breaching',
                  })}
                </EuiText>
                <EuiTitle size="s">
                  <span>{breachingCount}</span>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder hasShadow={false} paddingSize="m">
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="warning" size="l" color={degradingCount > 0 ? 'warning' : 'subdued'} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('entityCentricLabFlyout.flyout.slos.stats.degrading', {
                    defaultMessage: 'Degrading',
                  })}
                </EuiText>
                <EuiTitle size="s">
                  <span>{degradingCount}</span>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <div style={{ marginTop: 16 }}>
        <EuiPanel hasBorder hasShadow={false} paddingSize="m">
          <EuiBasicTable<SloRow>
            items={[...slos.slos]}
            columns={columns}
            tableCaption={i18n.translate('entityCentricLabFlyout.flyout.slos.tableCaption', {
              defaultMessage: 'Service Level Objectives',
            })}
            data-test-subj="entityCentricLabSlosTable"
          />
        </EuiPanel>
      </div>
    </>
  );
};
