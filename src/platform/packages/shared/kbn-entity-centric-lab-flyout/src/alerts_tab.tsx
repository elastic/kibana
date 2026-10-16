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
  EuiButton,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
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
import { alertRowToStableRuleUuid } from './alert_row_ids';
import { formatIncidentTick } from './time_domain';

interface AlertsTabProps {
  readonly alerts: AlertsTabData;
  readonly entityName: string;
}

const CREATE_ALERT_RULE_TYPE_ID = 'observability.rules.custom_threshold';

/** App path under the current Kibana base path, opened from a flyout link. */
const kibanaAppHref = (appPath: string): string => {
  const appIndex = window.location.pathname.indexOf('/app/');
  const basePath = appIndex > 0 ? window.location.pathname.slice(0, appIndex) : '';
  return `${basePath}${appPath}`;
};

export const AlertsNotConfiguredPrompt = () => (
  <EuiEmptyPrompt
    iconType="bell"
    title={
      <h2>
        {i18n.translate('entityCentricLabFlyout.flyout.alerts.empty.title', {
          defaultMessage: 'No alerts set up',
        })}
      </h2>
    }
    body={
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('entityCentricLabFlyout.flyout.alerts.empty.body', {
            defaultMessage:
              'Alert rules notify you when this resource crosses a threshold. Create an alert to start monitoring it.',
          })}
        </p>
      </EuiText>
    }
    actions={
      <EuiButton
        color="primary"
        href={kibanaAppHref(`/app/rules/create/${encodeURIComponent(CREATE_ALERT_RULE_TYPE_ID)}`)}
        target="_blank"
        iconType="popout"
        iconSide="right"
        data-test-subj="entityCentricLabAlertsCreateButton"
      >
        {i18n.translate('entityCentricLabFlyout.flyout.alerts.empty.createButton', {
          defaultMessage: 'Create alert',
        })}
      </EuiButton>
    }
  />
);

export const AlertsTab = ({ alerts, entityName }: AlertsTabProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    charts,
    notifications,
    renderAlertDetailFlyout,
    onOpenAlertDetail,
    renderRuleDetailFlyout,
    onOpenRuleDetail,
    density,
  } = useEntityFlyoutServices();
  const chartBaseTheme = charts.theme.useChartsBaseTheme();
  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedAlertRow, setSelectedAlertRow] = useState<AlertRow | null>(null);
  const [selectedRuleRow, setSelectedRuleRow] = useState<AlertRow | null>(null);

  const openAlertRow = useCallback(
    (row: AlertRow) => {
      if (onOpenAlertDetail) {
        onOpenAlertDetail({ alertRow: row, entityName });
        return;
      }
      if (renderAlertDetailFlyout) {
        setSelectedAlertRow(row);
        return;
      }
      notifications.toasts.addWarning({
        title: i18n.translate('entityCentricLabFlyout.flyout.alerts.openUnavailableTitle', {
          defaultMessage: 'Alert details unavailable',
        }),
        text: i18n.translate('entityCentricLabFlyout.flyout.alerts.openUnavailableBody', {
          defaultMessage:
            'Restart Kibana after pulling the latest entity-centric changes. The Observability alert flyout could not be loaded.',
        }),
      });
    },
    [entityName, notifications.toasts, onOpenAlertDetail, renderAlertDetailFlyout]
  );

  const openRuleRow = useCallback(
    (row: AlertRow) => {
      const ruleId = alertRowToStableRuleUuid(row);
      if (onOpenRuleDetail) {
        onOpenRuleDetail({ ruleId, ruleName: row.ruleName, entityName, alertRow: row });
        return;
      }
      if (renderRuleDetailFlyout) {
        setSelectedRuleRow(row);
        return;
      }
      notifications.toasts.addWarning({
        title: i18n.translate('entityCentricLabFlyout.flyout.alerts.openRuleUnavailableTitle', {
          defaultMessage: 'Rule details unavailable',
        }),
        text: i18n.translate('entityCentricLabFlyout.flyout.alerts.openRuleUnavailableBody', {
          defaultMessage:
            'Restart Kibana after pulling the latest entity-centric changes. The Observability rule flyout could not be loaded.',
        }),
      });
    },
    [entityName, notifications.toasts, onOpenRuleDetail, renderRuleDetailFlyout]
  );

  const pageOfItems = useMemo(
    () => alerts.details.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [alerts.details, pageIndex, pageSize]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<AlertRow>>>(
    () => [
      {
        field: 'id',
        name: '',
        width: '40px',
        render: (_id: string, row: AlertRow) => (
          <EuiToolTip
            content={i18n.translate('entityCentricLabFlyout.flyout.alerts.expandAlertTooltip', {
              defaultMessage: 'View alert details',
            })}
          >
            <EuiButtonIcon
              iconType="expand"
              color="text"
              size="xs"
              aria-label={i18n.translate(
                'entityCentricLabFlyout.flyout.alerts.expandAlertAriaLabel',
                {
                  defaultMessage: 'View alert details for {ruleName}',
                  values: { ruleName: row.ruleName },
                }
              )}
              onClick={() => openAlertRow(row)}
              data-test-subj="entityCentricLabAlertsExpandButton"
            />
          </EuiToolTip>
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
        render: (triggeredAt: string) => <EuiText size={density === 'compact' ? 'xs' : 's'}>{triggeredAt}</EuiText>,
      },
      {
        field: 'ruleName',
        name: i18n.translate('entityCentricLabFlyout.flyout.alerts.columns.ruleName', {
          defaultMessage: 'Rule name',
        }),
        render: (ruleName: string, row: AlertRow) => (
          <EuiText size={density === 'compact' ? 'xs' : 's'}>
            <a
              role="button"
              tabIndex={0}
              data-test-subj="entityCentricLabAlertsRuleLink"
              css={css`
                color: ${euiTheme.colors.primaryText};
                cursor: pointer;
                &:hover { text-decoration: underline; }
              `}
              onClick={(event) => {
                event.preventDefault();
                openRuleRow(row);
              }}
              onKeyDown={(event) => { if (event.key === 'Enter') openRuleRow(row); }}
            >
              {ruleName}
            </a>
          </EuiText>
        ),
      },
      {
        field: 'reason',
        name: i18n.translate('entityCentricLabFlyout.flyout.alerts.columns.reason', {
          defaultMessage: 'Reason',
        }),
        render: (reason: string, row: AlertRow) => (
          <EuiText
            size={density === 'compact' ? 'xs' : 's'}
            css={css`
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            `}
          >
            <a
              role="button"
              tabIndex={0}
              css={css`
                color: ${euiTheme.colors.primaryText};
                cursor: pointer;
                &:hover { text-decoration: underline; }
              `}
              onClick={(event) => {
                event.preventDefault();
                openAlertRow(row);
              }}
              onKeyDown={(event) => { if (event.key === 'Enter') openAlertRow(row); }}
            >
              {reason}
            </a>
          </EuiText>
        ),
      },
    ],
    [openAlertRow, openRuleRow, density]
  );

  const activePercent =
    alerts.totalCount > 0 ? Math.round((alerts.activeCount / alerts.totalCount) * 100) : 0;

  if (alerts.rulesConfigured === false) {
    return <AlertsNotConfiguredPrompt />;
  }

  return (
    <>
      <EuiFlexGroup gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false} style={{ minWidth: 220 }}>
          <EuiPanel hasBorder hasShadow={false} paddingSize="s">
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="stretch">
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
                <EuiTitle size="xxs">
                  <h4>
                    {i18n.translate('entityCentricLabFlyout.flyout.alerts.activeAlertsTitle', {
                      defaultMessage: 'Active alerts',
                    })}
                  </h4>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  {i18n.translate('entityCentricLabFlyout.flyout.alerts.activePercent', {
                    defaultMessage: '{percent}% of {total}',
                    values: { percent: activePercent, total: alerts.totalCount },
                  })}
                </EuiText>
                <EuiSpacer size="s" />
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
          <EuiPanel hasBorder hasShadow={false} paddingSize="s">
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem>
                <EuiTitle size="xxs">
                  <h4>
                    {i18n.translate(
                      'entityCentricLabFlyout.flyout.alerts.activeAlertsOverTimeTitle',
                      { defaultMessage: 'Active alerts over time' }
                    )}
                  </h4>
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

      <EuiSpacer size="s" />

      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('entityCentricLabFlyout.flyout.alerts.detailsTitle', {
            defaultMessage: 'Active alerts details',
          })}
        </h4>
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
          compressed={density === 'compact'}
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

      {!onOpenAlertDetail && selectedAlertRow && renderAlertDetailFlyout
        ? renderAlertDetailFlyout({
            alertRow: selectedAlertRow,
            entityName,
            onClose: () => setSelectedAlertRow(null),
          })
        : null}

      {!onOpenRuleDetail && selectedRuleRow && renderRuleDetailFlyout
        ? renderRuleDetailFlyout({
            ruleId: alertRowToStableRuleUuid(selectedRuleRow),
            ruleName: selectedRuleRow.ruleName,
            entityName,
            alertRow: selectedRuleRow,
            onClose: () => setSelectedRuleRow(null),
          })
        : null}
    </>
  );
};
