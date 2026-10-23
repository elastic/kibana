/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { type ReactNode } from 'react';
import { Sparkline } from '../sparkline';
import type { SparklinePoint } from '../sparkline/utils';

const PANEL_WIDTH = 380;
const SPARKLINE_HEIGHT = 24;

/** Whether a metric change is an improvement, a regression, or neutral — the caller decides. */
export type ServiceMetricEvaluation = 'good' | 'bad' | 'neutral';

export interface ServiceMetricChange {
  /** Pre-formatted magnitude, e.g. `6.25%`. */
  label: string;
  direction: 'increase' | 'decrease' | 'neutral';
  evaluation: ServiceMetricEvaluation;
}

export interface ServiceSummaryMetric {
  label: string;
  /** Pre-formatted value, e.g. `1,000 ms` or `N/A`. Formatting is the caller's responsibility. */
  valueLabel: ReactNode;
  /** Series color (an EUI vis palette token). */
  color: string;
  series?: SparklinePoint[] | null;
  comparisonSeries?: SparklinePoint[];
  comparisonColor?: string;
  change?: ServiceMetricChange;
}

export type ServiceSloStatus = 'violated' | 'degrading' | 'healthy' | 'no_data';

export interface ServiceSummaryHealth {
  activeAlertCount?: number;
  slo?: {
    status: ServiceSloStatus;
    violatedCount?: number;
  };
}

export interface ServiceSummaryLink {
  label: string;
  iconType?: string;
  href?: string;
  onClick?: () => void;
  /** When true, renders a trailing external-link affordance. */
  external?: boolean;
  /** Optional trailing count badge (e.g. active alerts count). */
  badgeLabel?: ReactNode;
  /** Badge color (an EUI badge color token). Defaults to `hollow`. */
  badgeColor?: string;
  'data-test-subj'?: string;
}

export interface ServiceSummaryProps {
  serviceName: string;
  environment?: string;
  agentName?: string;
  /** When set, the service name in the header links to this URL (opens in a new tab). */
  serviceHref?: string;
  /** Service/agent icon rendered in the header. */
  icon?: ReactNode;
  health?: ServiceSummaryHealth;
  /** Ordered metrics (typically latency, throughput, failed transaction rate). */
  metrics: ServiceSummaryMetric[];
  /** When false, renders values without charts (Design B). Defaults to true. */
  showSparklines?: boolean;
  isLoading?: boolean;
  /** Secondary links ("Open overview", "Active alerts", …). */
  links?: ServiceSummaryLink[];
  onClose?: () => void;
  onFilterFor?: () => void;
  onFilterOut?: () => void;
  onCopyValue?: () => void;
}

const SLO_HEALTH_COLOR: Record<ServiceSloStatus, string> = {
  violated: 'danger',
  degrading: 'warning',
  healthy: 'success',
  no_data: 'subdued',
};

const CHANGE_ICON: Record<ServiceMetricChange['direction'], string> = {
  increase: 'sortUp',
  decrease: 'sortDown',
  neutral: 'minus',
};

export function ServiceSummary({
  serviceName,
  environment,
  agentName,
  serviceHref,
  icon,
  health,
  metrics,
  showSparklines = true,
  isLoading = false,
  links = [],
  onClose,
  onFilterFor,
  onFilterOut,
  onCopyValue,
}: ServiceSummaryProps) {
  return (
    <EuiPanel
      hasShadow
      paddingSize="none"
      css={css`
        width: ${PANEL_WIDTH}px;
      `}
      data-test-subj="serviceSummaryPanel"
    >
      <Section>
        <Header
          serviceName={serviceName}
          environment={environment}
          agentName={agentName}
          serviceHref={serviceHref}
          icon={icon}
          onClose={onClose}
        />
      </Section>

      {onFilterFor || onFilterOut || onCopyValue ? (
        <>
          <EuiHorizontalRule margin="none" />
          <FilterActions
            onFilterFor={onFilterFor}
            onFilterOut={onFilterOut}
            onCopyValue={onCopyValue}
          />
        </>
      ) : null}

      {health ? (
        <>
          <EuiHorizontalRule margin="none" />
          <Section>
            <HealthSection health={health} />
          </Section>
        </>
      ) : null}

      <EuiHorizontalRule margin="none" />
      <Section>
        <MetricsSection metrics={metrics} showSparklines={showSparklines} isLoading={isLoading} />
      </Section>

      {links.length > 0 ? (
        <>
          <EuiHorizontalRule margin="none" />
          <Section>
            <LinksSection links={links} />
          </Section>
        </>
      ) : null}
    </EuiPanel>
  );
}

function Section({ children }: { children: ReactNode }) {
  return (
    <div
      css={css`
        padding: 12px 16px;
      `}
    >
      {children}
    </div>
  );
}

function Header({
  serviceName,
  environment,
  agentName,
  serviceHref,
  icon,
  onClose,
}: Pick<
  ServiceSummaryProps,
  'serviceName' | 'environment' | 'agentName' | 'serviceHref' | 'icon' | 'onClose'
>) {
  const subtitle = [environment, agentName].filter(Boolean).join(' · ');
  const closeLabel = i18n.translate('apmUiShared.serviceSummary.closeAriaLabel', {
    defaultMessage: 'Close service summary',
  });

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {icon ? <EuiFlexItem grow={false}>{icon}</EuiFlexItem> : null}
      <EuiFlexItem>
        {subtitle ? (
          <EuiText size="xs" color="subdued">
            {subtitle}
          </EuiText>
        ) : null}
        <EuiTitle size="xs">
          <h3 data-test-subj="serviceSummaryServiceName">
            {serviceHref ? (
              <EuiLink href={serviceHref} target="_blank" external={false}>
                {serviceName}
              </EuiLink>
            ) : (
              serviceName
            )}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      {onClose ? (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={closeLabel} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="cross"
              color="text"
              onClick={onClose}
              aria-label={closeLabel}
              data-test-subj="serviceSummaryCloseButton"
            />
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}

function HealthSection({ health }: { health: ServiceSummaryHealth }) {
  const { activeAlertCount, slo } = health;
  const hasAlerts = typeof activeAlertCount === 'number' && activeAlertCount > 0;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        {hasAlerts ? (
          <EuiBadge color="danger" iconType="bell" data-test-subj="serviceSummaryAlertsBadge">
            {i18n.translate('apmUiShared.serviceSummary.activeAlerts', {
              defaultMessage: '{count, plural, one {# alert active} other {# alerts active}}',
              values: { count: activeAlertCount },
            })}
          </EuiBadge>
        ) : (
          <EuiHealth color="success" data-test-subj="serviceSummaryNoAlerts">
            {i18n.translate('apmUiShared.serviceSummary.noAlerts', {
              defaultMessage: 'No alerts',
            })}
          </EuiHealth>
        )}
      </EuiFlexItem>
      {slo ? (
        <EuiFlexItem grow={false}>
          <EuiHealth color={SLO_HEALTH_COLOR[slo.status]} data-test-subj="serviceSummarySloHealth">
            {getSloLabel(slo)}
          </EuiHealth>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}

function getSloLabel(slo: NonNullable<ServiceSummaryHealth['slo']>): string {
  switch (slo.status) {
    case 'violated':
      return i18n.translate('apmUiShared.serviceSummary.sloViolated', {
        defaultMessage: '{count, plural, one {# SLO violated} other {# SLOs violated}}',
        values: { count: slo.violatedCount ?? 1 },
      });
    case 'degrading':
      return i18n.translate('apmUiShared.serviceSummary.sloDegrading', {
        defaultMessage: 'SLO degrading',
      });
    case 'healthy':
      return i18n.translate('apmUiShared.serviceSummary.sloHealthy', {
        defaultMessage: 'SLOs healthy',
      });
    case 'no_data':
      return i18n.translate('apmUiShared.serviceSummary.sloNoData', {
        defaultMessage: 'No SLOs',
      });
  }
}

function MetricsSection({
  metrics,
  showSparklines,
  isLoading,
}: {
  metrics: ServiceSummaryMetric[];
  showSparklines: boolean;
  isLoading: boolean;
}) {
  return (
    <EuiFlexGroup gutterSize="m" responsive={false}>
      {metrics.map((metric) => (
        <EuiFlexItem key={metric.label}>
          <MetricColumn metric={metric} showSparkline={showSparklines} isLoading={isLoading} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

function MetricColumn({
  metric,
  showSparkline,
  isLoading,
}: {
  metric: ServiceSummaryMetric;
  showSparkline: boolean;
  isLoading: boolean;
}) {
  const { label, valueLabel, color, series, comparisonSeries, comparisonColor, change } = metric;
  const hasSeries = !!series?.some((point) => point.y !== null);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>{valueLabel}</strong>
        </EuiText>
      </EuiFlexItem>
      {change ? (
        <EuiFlexItem grow={false}>
          <MetricChangeLabel change={change} />
        </EuiFlexItem>
      ) : null}
      {showSparkline ? (
        <EuiFlexItem grow={false}>
          {hasSeries || isLoading ? (
            <Sparkline
              color={color}
              series={series ?? null}
              comparisonSeries={comparisonSeries}
              comparisonSeriesColor={comparisonColor}
              compact
              fill
              isLoading={isLoading && !hasSeries}
            />
          ) : (
            <NoDataPlaceholder color={color} />
          )}
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}

function NoDataPlaceholder({ color }: { color: string }) {
  return (
    <div
      css={css`
        height: ${SPARKLINE_HEIGHT}px;
        display: flex;
        align-items: center;
      `}
      data-test-subj="serviceSummaryMetricNoData"
    >
      <div
        css={css`
          width: 100%;
          border-top: 2px dashed ${color};
        `}
      />
    </div>
  );
}

function MetricChangeLabel({ change }: { change: ServiceMetricChange }) {
  const { euiTheme } = useEuiTheme();

  const color =
    change.evaluation === 'good'
      ? euiTheme.colors.textSuccess
      : change.evaluation === 'bad'
      ? euiTheme.colors.textDanger
      : euiTheme.colors.textSubdued;

  return (
    <EuiText
      size="xs"
      css={css`
        color: ${color};
        white-space: nowrap;
      `}
      data-test-subj="serviceSummaryMetricChange"
    >
      <EuiIcon type={CHANGE_ICON[change.direction]} size="s" aria-hidden={true} /> {change.label}
    </EuiText>
  );
}

function FilterActions({
  onFilterFor,
  onFilterOut,
  onCopyValue,
}: Pick<ServiceSummaryProps, 'onFilterFor' | 'onFilterOut' | 'onCopyValue'>) {
  const { euiTheme } = useEuiTheme();

  const actions = [
    onFilterFor
      ? {
          key: 'filterFor',
          iconType: 'plusCircle',
          label: i18n.translate('apmUiShared.serviceSummary.filterFor', {
            defaultMessage: 'Filter for',
          }),
          onClick: onFilterFor,
          'data-test-subj': 'serviceSummaryFilterFor',
        }
      : null,
    onFilterOut
      ? {
          key: 'filterOut',
          iconType: 'minusCircle',
          label: i18n.translate('apmUiShared.serviceSummary.filterOut', {
            defaultMessage: 'Filter out',
          }),
          onClick: onFilterOut,
          'data-test-subj': 'serviceSummaryFilterOut',
        }
      : null,
    onCopyValue
      ? {
          key: 'copyValue',
          iconType: 'copy',
          label: i18n.translate('apmUiShared.serviceSummary.copyValue', {
            defaultMessage: 'Copy value',
          }),
          onClick: onCopyValue,
          'data-test-subj': 'serviceSummaryCopyValue',
        }
      : null,
  ].filter((action): action is NonNullable<typeof action> => action !== null);

  return (
    <EuiFlexGroup gutterSize="none" responsive={false}>
      {actions.map((action, index) => (
        <EuiFlexItem
          key={action.key}
          css={
            index < actions.length - 1
              ? css`
                  border-right: ${euiTheme.border.thin};
                `
              : undefined
          }
        >
          <EuiButtonEmpty
            size="s"
            color="text"
            iconType={action.iconType}
            onClick={action.onClick}
            contentProps={{
              css: css`
                justify-content: flex-start;
              `,
            }}
            css={css`
              border-radius: 0;
            `}
            data-test-subj={action['data-test-subj']}
          >
            {action.label}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

function LinksSection({ links }: { links: ServiceSummaryLink[] }) {
  return (
    <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
      {links.map((link) => (
        <EuiFlexItem key={link.label} grow={false}>
          <LinkRow link={link} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

function LinkRow({ link }: { link: ServiceSummaryLink }) {
  const { label, iconType, href, onClick, external, badgeLabel, badgeColor } = link;

  return (
    <EuiLink
      href={href}
      onClick={onClick}
      target={external ? '_blank' : undefined}
      external={false}
      color="text"
      data-test-subj={link['data-test-subj']}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        {iconType ? (
          <EuiFlexItem grow={false}>
            <EuiIcon type={iconType} size="m" aria-hidden={true} />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>{label}</EuiFlexItem>
        {badgeLabel != null ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color={badgeColor ?? 'hollow'}>{badgeLabel}</EuiBadge>
          </EuiFlexItem>
        ) : null}
        {external ? (
          <EuiFlexItem grow={false}>
            <EuiIcon type="external" size="s" color="subdued" aria-hidden={true} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiLink>
  );
}
