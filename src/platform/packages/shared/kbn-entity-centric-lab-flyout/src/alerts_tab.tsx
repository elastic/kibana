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
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  type EuiBasicTableColumn,
  type Criteria,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { Axis, Chart, LineSeries, Position, ScaleType, Settings } from '@elastic/charts';
import { useEntityFlyoutServices } from './services_context';
import type { AlertRow, AlertsTabData } from './fake_entity_tabs';
import { formatIncidentTick } from './time_domain';

interface AlertsTabProps {
  readonly alerts: AlertsTabData;
}

export const AlertsTab = ({ alerts }: AlertsTabProps) => {
  const { euiTheme } = useEuiTheme();
  const { charts } = useEntityFlyoutServices();
  const chartBaseTheme = charts.theme.useChartsBaseTheme();
  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const pageOfItems = useMemo(
    () => alerts.details.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [alerts.details, pageIndex, pageSize]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<AlertRow>>>(
    () => [
      {
        field: 'id',
        name: i18n.translate('entityCentricLabFlyout.flyout.alerts.columns.actions', {
          defaultMessage: 'Actions',
        }),
        width: '70px',
        render: () => (
          <EuiButtonIcon
            iconType="arrowRight"
            color="primary"
            aria-label={i18n.translate('entityCentricLabFlyout.flyout.alerts.openAlertAriaLabel', {
              defaultMessage: 'Open alert',
            })}
          />
        ),
      },
      {
        field: 'status',
        name: i18n.translate('entityCentricLabFlyout.flyout.alerts.columns.status', {
          defaultMessage: 'Status',
        }),
        width: '100px',
        render: (status: AlertRow['status']) => <EuiBadge color="danger">{status}</EuiBadge>,
      },
      {
        field: 'triggeredAt',
        name: i18n.translate('entityCentricLabFlyout.flyout.alerts.columns.triggered', {
          defaultMessage: 'Triggered',
        }),
        sortable: true,
        render: (triggeredAt: string) => <EuiText size="s">{triggeredAt}</EuiText>,
      },
      {
        field: 'ruleName',
        name: i18n.translate('entityCentricLabFlyout.flyout.alerts.columns.ruleName', {
          defaultMessage: 'Rule name',
        }),
        render: (ruleName: string) => (
          <EuiLink data-test-subj="entityCentricLabAlertsRuleLink">{ruleName}</EuiLink>
        ),
      },
      {
        field: 'reason',
        name: i18n.translate('entityCentricLabFlyout.flyout.alerts.columns.reason', {
          defaultMessage: 'Reason',
        }),
        render: (reason: string) => (
          <EuiText
            size="s"
            css={css`
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            `}
          >
            {reason}
          </EuiText>
        ),
      },
    ],
    []
  );

  const activePercent = Math.round((alerts.activeCount / alerts.totalCount) * 100);

  return (
    <>
      <EuiFlexGroup gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false} style={{ minWidth: 220 }}>
          <EuiPanel hasBorder hasShadow={false} paddingSize="m">
            <EuiFlexGroup gutterSize="m" responsive={false} alignItems="stretch">
              <EuiFlexItem grow={false}>
                <div
                  aria-hidden
                  css={css`
                    width: 6px;
                    align-self: stretch;
                    background-color: ${euiTheme.colors.danger};
                    border-radius: ${euiTheme.border.radius.small};
                  `}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate('entityCentricLabFlyout.flyout.alerts.activeAlertsTitle', {
                      defaultMessage: 'Active alerts',
                    })}
                  </h3>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  {i18n.translate('entityCentricLabFlyout.flyout.alerts.activePercent', {
                    defaultMessage: '{percent}% of {total}',
                    values: { percent: activePercent, total: alerts.totalCount },
                  })}
                </EuiText>
                <EuiSpacer size="m" />
                <EuiText
                  textAlign="right"
                  css={css`
                    color: ${euiTheme.colors.danger};
                    font-weight: ${euiTheme.font.weight.bold};
                    font-size: 36px;
                    line-height: 1;
                  `}
                >
                  {alerts.activeCount}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem style={{ minWidth: 260 }}>
          <EuiPanel hasBorder hasShadow={false} paddingSize="m">
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    {i18n.translate(
                      'entityCentricLabFlyout.flyout.alerts.activeAlertsOverTimeTitle',
                      { defaultMessage: 'Active alerts over time' }
                    )}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate('entityCentricLabFlyout.flyout.alerts.overTimeTooltip', {
                    defaultMessage:
                      'Number of active alerts attributed to this entity over the selected time window.',
                  })}
                  position="top"
                  delay="long"
                >
                  <EuiButtonIcon
                    iconType="question"
                    color="text"
                    aria-label={i18n.translate(
                      'entityCentricLabFlyout.flyout.alerts.overTimeTooltipAriaLabel',
                      { defaultMessage: 'Show chart description' }
                    )}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <div style={{ height: 140 }} data-test-subj="entityCentricLabAlertsOverTimeChart">
              <Chart>
                <Settings baseTheme={chartBaseTheme} locale={i18n.getLocale()} showLegend={false} />
                <Axis
                  id="alerts-over-time-x"
                  position={Position.Bottom}
                  tickFormat={(value) => formatIncidentTick(Number(value))}
                />
                <Axis id="alerts-over-time-y" position={Position.Left} />
                <LineSeries
                  id="active-alerts"
                  name="Active alerts"
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor="x"
                  yAccessors={['y']}
                  data={alerts.overTime as Array<{ x: number; y: number }>}
                  color={euiTheme.colors.vis.euiColorVis0}
                  // Pin time axis to UTC so the alert-count climb at 02:47:31
                  // UTC lines up with the AI summary copy and log timestamps.
                  timeZone="utc"
                />
              </Chart>
            </div>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <span
                  aria-hidden
                  css={css`
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: ${euiTheme.colors.vis.euiColorVis0};
                    display: inline-block;
                  `}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('entityCentricLabFlyout.flyout.alerts.activeAlertsLegend', {
                    defaultMessage: 'Active alerts',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiPanel hasBorder hasShadow={false} paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('entityCentricLabFlyout.flyout.alerts.detailsTitle', {
              defaultMessage: 'Active alerts details',
            })}
          </h3>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {i18n.translate('entityCentricLabFlyout.flyout.alerts.showingCount', {
            defaultMessage:
              'Showing {start}-{end} of {total} {total, plural, one {Alert} other {Alerts}}',
            values: {
              start: pageIndex * pageSize + 1,
              end: Math.min((pageIndex + 1) * pageSize, alerts.details.length),
              total: alerts.details.length,
            },
          })}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiBasicTable<AlertRow>
          items={pageOfItems as AlertRow[]}
          columns={columns}
          tableCaption={i18n.translate('entityCentricLabFlyout.flyout.alerts.detailsTableCaption', {
            defaultMessage: 'Active alerts details',
          })}
          pagination={{
            pageIndex,
            pageSize,
            totalItemCount: alerts.details.length,
            pageSizeOptions: [10, 25, 50],
          }}
          onChange={({ page }: Criteria<AlertRow>) => {
            if (page) {
              setPagination({ pageIndex: page.index, pageSize: page.size });
            }
          }}
          data-test-subj="entityCentricLabAlertsDetailsTable"
        />
      </EuiPanel>
    </>
  );
};
