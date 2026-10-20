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
import { Sparkline, type SparklinePoint } from '@kbn/apm-ui-shared';

const PANEL_WIDTH = 380;
const SPARKLINE_HEIGHT = 24;
// Fixed label/value column width for the stacked layout so every chart starts at the same x and
// they all share one width (otherwise shorter labels like "Error rate" give wider charts).
const METRIC_LABEL_COLUMN_WIDTH = 112;

/** Whether a metric change is an improvement, a regression, or neutral — the caller decides. */
export type EntityMetricEvaluation = 'good' | 'bad' | 'neutral';

export interface EntityMetricChange {
  /** Pre-formatted magnitude, e.g. `6.25%`. */
  label: string;
  direction: 'increase' | 'decrease' | 'neutral';
  evaluation: EntityMetricEvaluation;
}

export interface EntitySummaryMetric {
  label: string;
  /** Pre-formatted value, e.g. `1,000 ms` or `N/A`. Formatting is the caller's responsibility. */
  valueLabel: ReactNode;
  /** Series color (an EUI vis palette token). */
  color: string;
  series?: SparklinePoint[] | null;
  comparisonSeries?: SparklinePoint[];
  comparisonColor?: string;
  change?: EntityMetricChange;
}

export type EntitySloStatus = 'violated' | 'degrading' | 'healthy' | 'no_data';

export interface EntitySummaryHealth {
  activeAlertCount?: number;
  slo?: {
    status: EntitySloStatus;
    violatedCount?: number;
  };
}

export interface EntitySummaryLink {
  /** Stable identity so callers can override, reorder, or hide a link by id. */
  id: string;
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

export interface EntitySummaryProps {
  /** Entity display name shown in the header (e.g. a service or host name). */
  title: string;
  /** Secondary header line (e.g. `environment · agent`). The caller composes it. */
  subtitle?: ReactNode;
  /** When set, the title links to this URL (opens in a new tab). */
  titleHref?: string;
  /** Entity icon rendered in the header. */
  icon?: ReactNode;
  health?: EntitySummaryHealth;
  /** Ordered metrics (e.g. latency, throughput, failed transaction rate). */
  metrics: EntitySummaryMetric[];
  /** Lay the metrics out side by side (`row`, default) or stacked (`column`). */
  metricsDirection?: 'row' | 'column';
  /** When false, renders values without charts (Design B). Defaults to true. */
  showSparklines?: boolean;
  isLoading?: boolean;
  /** Secondary links ("Open overview", "Active alerts", …). */
  links?: EntitySummaryLink[];
  onClose?: () => void;
  onFilterFor?: () => void;
  onFilterOut?: () => void;
  onCopyValue?: () => void;
}

const SLO_HEALTH_COLOR: Record<EntitySloStatus, string> = {
  violated: 'danger',
  degrading: 'warning',
  healthy: 'success',
  no_data: 'subdued',
};

const CHANGE_ICON: Record<EntityMetricChange['direction'], string> = {
  increase: 'sortUp',
  decrease: 'sortDown',
  neutral: 'minus',
};

/**
 * Entity-agnostic summary popover body: a header, optional filter actions, optional health, a
 * metrics section (with sparklines), and a list of links. Purely presentational — callers map
 * their own data into the generic metric/link/health shapes.
 */
export function EntitySummary({
  title,
  subtitle,
  titleHref,
  icon,
  health,
  metrics,
  metricsDirection = 'row',
  showSparklines = true,
  isLoading = false,
  links = [],
  onClose,
  onFilterFor,
  onFilterOut,
  onCopyValue,
}: EntitySummaryProps) {
  return (
    <EuiPanel
      hasShadow
      paddingSize="none"
      css={css`
        width: ${PANEL_WIDTH}px;
      `}
      data-test-subj="entitySummaryPanel"
    >
      <Section>
        <Header
          title={title}
          subtitle={subtitle}
          titleHref={titleHref}
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
        <MetricsSection
          metrics={metrics}
          direction={metricsDirection}
          showSparklines={showSparklines}
          isLoading={isLoading}
        />
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
  title,
  subtitle,
  titleHref,
  icon,
  onClose,
}: Pick<EntitySummaryProps, 'title' | 'subtitle' | 'titleHref' | 'icon' | 'onClose'>) {
  const closeLabel = i18n.translate('discover.entitySummary.closeAriaLabel', {
    defaultMessage: 'Close summary',
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
          <h3 data-test-subj="entitySummaryTitle">
            {titleHref ? (
              <EuiLink href={titleHref} target="_blank" external={false}>
                {title}
              </EuiLink>
            ) : (
              title
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
              data-test-subj="entitySummaryCloseButton"
            />
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}

function HealthSection({ health }: { health: EntitySummaryHealth }) {
  const { activeAlertCount, slo } = health;
  const hasAlerts = typeof activeAlertCount === 'number' && activeAlertCount > 0;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        {hasAlerts ? (
          <EuiBadge color="danger" iconType="bell" data-test-subj="entitySummaryAlertsBadge">
            {i18n.translate('discover.entitySummary.activeAlerts', {
              defaultMessage: '{count, plural, one {# alert active} other {# alerts active}}',
              values: { count: activeAlertCount },
            })}
          </EuiBadge>
        ) : (
          <EuiHealth color="success" data-test-subj="entitySummaryNoAlerts">
            {i18n.translate('discover.entitySummary.noAlerts', {
              defaultMessage: 'No alerts',
            })}
          </EuiHealth>
        )}
      </EuiFlexItem>
      {slo ? (
        <EuiFlexItem grow={false}>
          <EuiHealth color={SLO_HEALTH_COLOR[slo.status]} data-test-subj="entitySummarySloHealth">
            {getSloLabel(slo)}
          </EuiHealth>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}

function getSloLabel(slo: NonNullable<EntitySummaryHealth['slo']>): string {
  switch (slo.status) {
    case 'violated':
      return i18n.translate('discover.entitySummary.sloViolated', {
        defaultMessage: '{count, plural, one {# SLO violated} other {# SLOs violated}}',
        values: { count: slo.violatedCount ?? 1 },
      });
    case 'degrading':
      return i18n.translate('discover.entitySummary.sloDegrading', {
        defaultMessage: 'SLO degrading',
      });
    case 'healthy':
      return i18n.translate('discover.entitySummary.sloHealthy', {
        defaultMessage: 'SLOs healthy',
      });
    case 'no_data':
      return i18n.translate('discover.entitySummary.sloNoData', {
        defaultMessage: 'No SLOs',
      });
  }
}

function MetricsSection({
  metrics,
  direction,
  showSparklines,
  isLoading,
}: {
  metrics: EntitySummaryMetric[];
  direction: 'row' | 'column';
  showSparklines: boolean;
  isLoading: boolean;
}) {
  if (direction === 'column') {
    return (
      <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
        {metrics.map((metric) => (
          <EuiFlexItem key={metric.label} grow={false}>
            <MetricRow metric={metric} showSparkline={showSparklines} isLoading={isLoading} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }

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

// Stacked layout: label + value on the left, chart on the right, so the charts line up vertically.
function MetricRow({
  metric,
  showSparkline,
  isLoading,
}: {
  metric: EntitySummaryMetric;
  showSparkline: boolean;
  isLoading: boolean;
}) {
  const { label, valueLabel, change } = metric;

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
      <EuiFlexItem
        grow={false}
        css={css`
          width: ${METRIC_LABEL_COLUMN_WIDTH}px;
        `}
      >
        <EuiText size="xs" color="subdued">
          {label}
        </EuiText>
        <EuiText size="s">
          <strong>{valueLabel}</strong>
        </EuiText>
        {change ? <MetricChangeLabel change={change} /> : null}
      </EuiFlexItem>
      {showSparkline ? (
        <EuiFlexItem>
          <MetricSparkline metric={metric} isLoading={isLoading} fullWidth />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}

function MetricColumn({
  metric,
  showSparkline,
  isLoading,
}: {
  metric: EntitySummaryMetric;
  showSparkline: boolean;
  isLoading: boolean;
}) {
  const { label, valueLabel, change } = metric;

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
          <MetricSparkline metric={metric} isLoading={isLoading} />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}

// Shared chart renderer for both metric layouts: the sparkline, or a dashed placeholder for no data.
function MetricSparkline({
  metric,
  isLoading,
  fullWidth = false,
}: {
  metric: EntitySummaryMetric;
  isLoading: boolean;
  fullWidth?: boolean;
}) {
  const { color, series, comparisonSeries, comparisonColor } = metric;
  const hasSeries = !!series?.some((point) => point.y !== null);

  if (hasSeries || isLoading) {
    return (
      <Sparkline
        color={color}
        series={series ?? null}
        comparisonSeries={comparisonSeries}
        comparisonSeriesColor={comparisonColor}
        compact={!fullWidth}
        fullWidth={fullWidth}
        fill
        isLoading={isLoading && !hasSeries}
      />
    );
  }

  return <NoDataPlaceholder color={color} />;
}

function NoDataPlaceholder({ color }: { color: string }) {
  return (
    <div
      css={css`
        height: ${SPARKLINE_HEIGHT}px;
        display: flex;
        align-items: center;
      `}
      data-test-subj="entitySummaryMetricNoData"
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

function MetricChangeLabel({ change }: { change: EntityMetricChange }) {
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
      data-test-subj="entitySummaryMetricChange"
    >
      <EuiIcon type={CHANGE_ICON[change.direction]} size="s" aria-hidden={true} /> {change.label}
    </EuiText>
  );
}

function FilterActions({
  onFilterFor,
  onFilterOut,
  onCopyValue,
}: Pick<EntitySummaryProps, 'onFilterFor' | 'onFilterOut' | 'onCopyValue'>) {
  const { euiTheme } = useEuiTheme();

  const actions = [
    onFilterFor
      ? {
          key: 'filterFor',
          iconType: 'plusCircle',
          label: i18n.translate('discover.entitySummary.filterFor', {
            defaultMessage: 'Filter for',
          }),
          onClick: onFilterFor,
          'data-test-subj': 'entitySummaryFilterFor',
        }
      : null,
    onFilterOut
      ? {
          key: 'filterOut',
          iconType: 'minusCircle',
          label: i18n.translate('discover.entitySummary.filterOut', {
            defaultMessage: 'Filter out',
          }),
          onClick: onFilterOut,
          'data-test-subj': 'entitySummaryFilterOut',
        }
      : null,
    onCopyValue
      ? {
          key: 'copyValue',
          iconType: 'copy',
          label: i18n.translate('discover.entitySummary.copyValue', {
            defaultMessage: 'Copy value',
          }),
          onClick: onCopyValue,
          'data-test-subj': 'entitySummaryCopyValue',
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

function LinksSection({ links }: { links: EntitySummaryLink[] }) {
  return (
    <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
      {links.map((link) => (
        <EuiFlexItem key={link.id} grow={false}>
          <LinkRow link={link} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

function LinkRow({ link }: { link: EntitySummaryLink }) {
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
