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
const METRIC_LABEL_COLUMN_WIDTH = 112;

export interface EntitySummaryMetric {
  label: string;
  /** Pre-formatted value, e.g. `1,000 ms` or `N/A`. Formatting is the caller's responsibility. */
  valueLabel: ReactNode;
  /** Series color (an EUI vis palette token). */
  color: string;
  series?: SparklinePoint[] | null;
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
  /** Ordered metrics (e.g. latency, throughput, failed transaction rate). */
  metrics: EntitySummaryMetric[];
  /** Lay the metrics out side by side (`row`, default) or stacked (`column`). */
  metricsDirection?: 'row' | 'column';
  isLoading?: boolean;
  /** Secondary links ("Open overview", "Active alerts", …). */
  links?: EntitySummaryLink[];
  onClose?: () => void;
  onFilterFor?: () => void;
  onFilterOut?: () => void;
  onCopyValue?: () => void;
}

/**
 * Entity-agnostic summary popover body: a header, optional filter actions, a metrics section (with
 * sparklines), and a list of links. Purely presentational — callers map their own data into the
 * generic metric and link shapes.
 */
export function EntitySummary({
  title,
  subtitle,
  titleHref,
  icon,
  metrics,
  metricsDirection = 'row',
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

      <EuiHorizontalRule margin="none" />
      <Section>
        <MetricsSection metrics={metrics} direction={metricsDirection} isLoading={isLoading} />
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

function MetricsSection({
  metrics,
  direction,
  isLoading,
}: {
  metrics: EntitySummaryMetric[];
  direction: 'row' | 'column';
  isLoading: boolean;
}) {
  if (direction === 'column') {
    return (
      <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
        {metrics.map((metric) => (
          <EuiFlexItem key={metric.label} grow={false}>
            <MetricRow metric={metric} isLoading={isLoading} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup gutterSize="m" responsive={false}>
      {metrics.map((metric) => (
        <EuiFlexItem key={metric.label}>
          <MetricColumn metric={metric} isLoading={isLoading} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

// Stacked layout: label + value on the left, chart on the right, so the charts line up vertically.
function MetricRow({ metric, isLoading }: { metric: EntitySummaryMetric; isLoading: boolean }) {
  const { label, valueLabel } = metric;

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
      </EuiFlexItem>
      <EuiFlexItem>
        <MetricSparkline metric={metric} isLoading={isLoading} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// Horizontal layout: metrics sit side by side, each stacking label, value, and chart vertically.
function MetricColumn({ metric, isLoading }: { metric: EntitySummaryMetric; isLoading: boolean }) {
  const { label, valueLabel } = metric;

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
      <EuiFlexItem grow={false}>
        <MetricSparkline metric={metric} isLoading={isLoading} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// Shared chart renderer for both metric layouts: a full-width sparkline (so it fills its column and
// no horizontal space is wasted), or a dashed placeholder for no data.
function MetricSparkline({
  metric,
  isLoading,
}: {
  metric: EntitySummaryMetric;
  isLoading: boolean;
}) {
  const { color, series } = metric;
  const hasSeries = !!series?.some((point) => point.y !== null);

  if (hasSeries || isLoading) {
    return (
      <Sparkline
        color={color}
        series={series ?? null}
        fullWidth
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
