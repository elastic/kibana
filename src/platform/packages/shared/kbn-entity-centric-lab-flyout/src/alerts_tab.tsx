/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiPopover,
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
import type { AlertNotificationSuppression, AlertRow, AlertsTabData } from './fake_entity_tabs';
import { alertRowToStableRuleUuid } from './alert_row_ids';
import { formatIncidentTick, windowLabeledTimes, windowPoints } from './time_domain';
import { useResolvedFlyoutTimeRange } from './time_range_context';

interface AlertsTabProps {
  readonly alerts: AlertsTabData;
  readonly entityName: string;
}

const CREATE_ALERT_RULE_TYPE_ID = 'observability.rules.custom_threshold';

const popoverActionsCss = css`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
`;

/** Extends the hover target across the gap between the label and the portaled panel. */
const popoverHoverPadCss = css`
  position: relative;
  &::before {
    content: '';
    position: absolute;
    inset: -36px;
  }
  > * {
    position: relative;
    z-index: 1;
  }
`;

const stopPopoverClick = (event: React.MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
};

/**
 * Click popover for a disabled row. Layout follows the three cases:
 * snoozed, maintenance window, or both.
 */
const NotificationsSuppressedPopover = ({
  row,
  reasons,
  entityName,
  onClose,
}: {
  readonly row: AlertRow;
  readonly reasons: readonly AlertNotificationSuppression[];
  readonly entityName?: string;
  readonly onClose: () => void;
}) => {
  const hasSnooze = reasons.includes('snoozed');
  const hasMaintenance = reasons.includes('maintenanceWindow');
  const both = hasSnooze && hasMaintenance;
  const snoozeCopy = both
    ? i18n.translate('entityCentricLabFlyout.flyout.alerts.notifications.snoozedShort', {
        defaultMessage: 'Snoozed until 3:00 PM by Nicolas.',
      })
    : i18n.translate('entityCentricLabFlyout.flyout.alerts.notifications.snoozed', {
        defaultMessage: 'Snoozed until 3:00 PM by Nicolas. Applies to the {entityName} series.',
        values: { entityName: entityName ?? row.ruleName },
      });
  const maintenanceCopy = both
    ? i18n.translate('entityCentricLabFlyout.flyout.alerts.notifications.maintenanceShort', {
        defaultMessage: 'Maintenance window: Weekly patching, ends 4:00 AM.',
      })
    : i18n.translate('entityCentricLabFlyout.flyout.alerts.notifications.maintenanceWindow', {
        defaultMessage:
          'Maintenance window: Weekly patching, ends 4:00 AM. No notifications on start or recovery for alerts that began in this window.',
      });

  return (
    <div data-test-subj="entityCentricLabAlertsNotificationsPopover" style={{ width: 240 }}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="bellSlash" size="m" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>
              {i18n.translate('entityCentricLabFlyout.flyout.alerts.notifications.suppressedTitle', {
                defaultMessage: 'Actions suppressed',
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            iconSize="s"
            size="xs"
            color="text"
            aria-label={i18n.translate(
              'entityCentricLabFlyout.flyout.alerts.notifications.closePopover',
              { defaultMessage: 'Close' }
            )}
            onClick={onClose}
            data-test-subj="entityCentricLabAlertsNotificationsPopoverClose"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {hasSnooze ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s">{snoozeCopy}</EuiText>
          <EuiSpacer size="s" />
          <div css={popoverActionsCss}>
            <EuiButton size="s" color="text" onClick={stopPopoverClick}>
              {i18n.translate('entityCentricLabFlyout.flyout.alerts.notifications.unsnooze', {
                defaultMessage: 'Unsnooze',
              })}
            </EuiButton>
            {both ? null : (
              <EuiButton size="s" color="text" onClick={stopPopoverClick}>
                {i18n.translate('entityCentricLabFlyout.flyout.alerts.notifications.editSnooze', {
                  defaultMessage: 'Edit snooze',
                })}
              </EuiButton>
            )}
          </div>
        </>
      ) : null}
      {hasMaintenance ? (
        <>
          <EuiSpacer size={both ? 'm' : 's'} />
          <EuiText size="s">{maintenanceCopy}</EuiText>
          <EuiSpacer size="s" />
          <div css={popoverActionsCss}>
            <EuiButton size="s" color="text" onClick={stopPopoverClick}>
              {i18n.translate('entityCentricLabFlyout.flyout.alerts.notifications.viewWindow', {
                defaultMessage: 'View window',
              })}
            </EuiButton>
            {both ? null : (
              <EuiButton size="s" color="text" onClick={stopPopoverClick}>
                {i18n.translate('entityCentricLabFlyout.flyout.alerts.notifications.editWindow', {
                  defaultMessage: 'Edit window',
                })}
              </EuiButton>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

const HOVER_CLOSE_DELAY_MS = 400;

/**
 * Notifications & actions cell. Disabled carries a struck bell. Hovering it
 * opens the suppression popover for snooze, a maintenance window, or both.
 */
export const AlertNotificationsCell = ({
  row,
  textSize,
  entityName,
}: {
  readonly row: AlertRow;
  readonly textSize: 'xs' | 's';
  readonly entityName?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const panelNode = useRef<HTMLElement | null>(null);
  const clearCloseTimer = () => {
    if (closeTimer.current === undefined) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
  };
  const openPopover = () => {
    clearCloseTimer();
    setIsOpen(true);
  };
  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setIsOpen(false), HOVER_CLOSE_DELAY_MS);
  };
  const closeNow = () => {
    clearCloseTimer();
    setIsOpen(false);
  };
  useEffect(() => clearCloseTimer, []);
  const reasons = row.notificationSuppression ?? [];
  if (reasons.length === 0) {
    return (
      <EuiText
        size={textSize}
        color="subdued"
        data-test-subj="entityCentricLabAlertsNotificationsEnabled"
      >
        {i18n.translate('entityCentricLabFlyout.flyout.alerts.notifications.enabled', {
          defaultMessage: 'Enabled',
        })}
      </EuiText>
    );
  }
  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={closeNow}
      panelPaddingSize="m"
      anchorPosition="downLeft"
      panelRef={(node) => {
        panelNode.current = node;
      }}
      panelProps={{
        onMouseEnter: openPopover,
        onMouseLeave: scheduleClose,
      }}
      button={
        <button
          type="button"
          data-test-subj="entityCentricLabAlertsNotificationsDisabled"
          aria-expanded={isOpen}
          aria-label={i18n.translate(
            'entityCentricLabFlyout.flyout.alerts.notifications.disabledAriaLabel',
            { defaultMessage: 'Disabled. Show why notifications and actions are suppressed' }
          )}
          onMouseEnter={openPopover}
          onMouseLeave={scheduleClose}
          onFocus={openPopover}
          onBlur={(event) => {
            const next = event.relatedTarget;
            if (!(next instanceof Node) || panelNode.current?.contains(next)) return;
            scheduleClose();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: 'var(--euiTextSubduedColor)',
            fontSize: textSize === 'xs' ? 12 : 14,
            cursor: 'pointer',
          }}
        >
          <EuiIcon type="bellSlash" size="s" color="inherit" aria-hidden />
          {i18n.translate('entityCentricLabFlyout.flyout.alerts.notifications.disabled', {
            defaultMessage: 'Disabled',
          })}
        </button>
      }
    >
      <div css={popoverHoverPadCss} onMouseEnter={openPopover} onMouseLeave={scheduleClose}>
        <NotificationsSuppressedPopover
          row={row}
          reasons={reasons}
          entityName={entityName}
          onClose={closeNow}
        />
      </div>
    </EuiPopover>
  );
};

/** Lets Rule name and Reason wrap inside the fixed table layout. */
const wrappingCellCss = css`
  display: block;
  min-width: 0;
  max-width: 100%;
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-word;
`;

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
              'Alert rules notify you when this entity crosses a threshold. Create an alert to start monitoring it.',
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
  const timeRange = useResolvedFlyoutTimeRange();
  const overTime = useMemo(
    () => (timeRange ? windowPoints(alerts.overTime, timeRange) : alerts.overTime),
    [alerts.overTime, timeRange]
  );
  const details = useMemo(
    () =>
      timeRange
        ? windowLabeledTimes(
            alerts.details,
            (row) => row.triggeredAt,
            (row, triggeredAt) => ({ ...row, triggeredAt }),
            timeRange
          )
        : alerts.details,
    [alerts.details, timeRange]
  );
  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
  }, [timeRange?.startMs, timeRange?.endMs]);
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
    () => details.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [details, pageIndex, pageSize]
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
        field: 'notificationSuppression',
        name: i18n.translate('entityCentricLabFlyout.flyout.alerts.columns.notifications', {
          defaultMessage: 'Notifications & actions',
        }),
        width: '200px',
        render: (_value: AlertRow['notificationSuppression'], row: AlertRow) => (
          <AlertNotificationsCell
            row={row}
            textSize={density === 'compact' ? 'xs' : 's'}
            entityName={entityName}
          />
        ),
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
        truncateText: false,
        valign: 'top',
        render: (ruleName: string, row: AlertRow) => (
          <span css={wrappingCellCss}>
            <EuiText size={density === 'compact' ? 'xs' : 's'}>
              <a
                role="button"
                tabIndex={0}
                data-test-subj="entityCentricLabAlertsRuleLink"
                css={css`
                  color: ${euiTheme.colors.primaryText};
                  cursor: pointer;
                  white-space: normal;
                  overflow-wrap: break-word;
                  word-break: break-word;
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
          </span>
        ),
      },
      {
        field: 'reason',
        name: i18n.translate('entityCentricLabFlyout.flyout.alerts.columns.reason', {
          defaultMessage: 'Reason',
        }),
        truncateText: false,
        valign: 'top',
        render: (reason: string, row: AlertRow) => (
          <span css={wrappingCellCss}>
            <EuiText size={density === 'compact' ? 'xs' : 's'}>
              <a
                role="button"
                tabIndex={0}
                css={css`
                  color: ${euiTheme.colors.primaryText};
                  cursor: pointer;
                  white-space: normal;
                  overflow-wrap: break-word;
                  word-break: break-word;
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
          </span>
        ),
      },
    ],
    [openAlertRow, openRuleRow, density, euiTheme, entityName]
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
                <Settings
                  baseTheme={chartBaseTheme}
                  locale={i18n.getLocale()}
                  showLegend={false}
                  xDomain={
                    timeRange ? { min: timeRange.startMs, max: timeRange.endMs } : undefined
                  }
                />
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
                  data={overTime as Array<{ x: number; y: number }>}
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
            end: Math.min((pageIndex + 1) * pageSize, details.length),
            total: details.length,
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
            totalItemCount: details.length,
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
