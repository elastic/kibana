/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiIconTip,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiThemeComputed,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { MetricDatum } from '@elastic/charts';
import { Chart, Metric, MetricTrendShape, Settings } from '@elastic/charts';
import { useEntityFlyoutServices } from './services_context';
import { labThingLabel } from './lab_terminology';
import type {
  EntityDetailRow,
  EntityOverview,
  GoldenSignal,
  GoldenSignalLevel,
} from './fake_entity_overview';
import { formatGoldenSignalValue } from './fake_entity_overview';
import type { MetricsTabData, MetricEvent } from './fake_entity_tabs';
import { explainFlyoutMetric, MetricChartCard } from './metrics_tab';

/** Identity fields that duplicate the flyout / full-page title. */
const IDENTITY_DETAIL_IDS: ReadonlySet<string> = new Set([
  'clusterName',
  'nodeName',
  'podName',
  'serviceName',
  'hostname',
  'name',
  'instanceId',
  'functionName',
  'bucketName',
]);

const withoutRedundantName = (
  rows: readonly EntityDetailRow[],
  displayName: string
): readonly EntityDetailRow[] =>
  rows.filter((row) => row.value !== displayName && !IDENTITY_DETAIL_IDS.has(row.id));

interface OverviewTabProps {
  readonly overview: EntityOverview;
  /** Metrics data relocated from the (now removed) Metrics tab. */
  readonly metrics?: MetricsTabData;
  /** When true the AI-generated summary section is hidden (e.g. Phase 1). */
  readonly hideAiSummary?: boolean;
  /** When true the Ownership section is hidden (e.g. Phase 1). */
  readonly hideOwnership?: boolean;
  /** When true the "Surface events on graphs" toggle and event annotations are hidden (Phase 1). */
  readonly hideEvents?: boolean;
}

export const OverviewTab = ({
  overview,
  metrics,
  hideAiSummary = false,
  hideOwnership = false,
  hideEvents = false,
}: OverviewTabProps) => {
  const { resourceCopy = false } = useEntityFlyoutServices();
  const summaryAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabSummary' });
  const signalsAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabSignals' });
  const detailsAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabDetails' });
  const ownershipAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabOwnership' });

  const noEvents: readonly MetricEvent[] = [];
  const events = hideEvents || !metrics ? noEvents : metrics.events;
  const [primaryA, primaryB, primaryC] = metrics?.goldenSignals ?? [];
  const [otherA, otherB] = metrics?.otherMetrics ?? [];

  return (
    <>
      {!hideAiSummary && (
        <>
          <EuiAccordion
            id={summaryAccordionId}
            initialIsOpen
            buttonContent={
              <SectionTitle
                title={i18n.translate('entityCentricLabFlyout.flyout.overview.entitySummaryTitle', {
                  defaultMessage: '{thing} Summary',
                  values: { thing: labThingLabel(resourceCopy) },
                })}
                adornment={<AssistanceSparklesIcon />}
              />
            }
            paddingSize="s"
            data-test-subj="entityCentricLabOverviewEntitySummary"
          >
            <EntitySummaryCard overview={overview} />
          </EuiAccordion>

          <EuiSpacer size="s" />
        </>
      )}

      {overview.goldenSignals.length > 0 ? (
        <>
          <GoldenSignalsRow signals={overview.goldenSignals} />
          <EuiSpacer size="s" />
        </>
      ) : null}

      {/* Entity details (metadata) — quick-scan section before the heavier charts */}
      <EuiAccordion
        id={detailsAccordionId}
        initialIsOpen
        buttonContent={
          <SectionTitle
            title={i18n.translate('entityCentricLabFlyout.flyout.overview.entityDetailsTitle', {
              defaultMessage: '{thing} details',
              values: { thing: labThingLabel(resourceCopy) },
            })}
          />
        }
        paddingSize="s"
        data-test-subj="entityCentricLabOverviewEntityDetails"
      >
        <KeyValueGrid
          rows={withoutRedundantName(
            resourceCopy
              ? overview.details.map((row) =>
                  row.label === 'Entity id' ? { ...row, label: 'Resource id' } : row
                )
              : overview.details,
            overview.displayName
          )}
          ariaLabel={i18n.translate(
            'entityCentricLabFlyout.flyout.overview.entityDetailsAriaLabel',
            {
              defaultMessage: '{thing} details',
              values: { thing: labThingLabel(resourceCopy) },
            }
          )}
        />
      </EuiAccordion>

      <EuiSpacer size="s" />

      {/* Golden signals: high-level cards followed by time-series charts (relocated from the Metrics tab) */}
      <EuiAccordion
        id={signalsAccordionId}
        initialIsOpen
        buttonContent={
          <SectionTitle
            title={i18n.translate('entityCentricLabFlyout.flyout.overview.goldenSignalsTitle', {
              defaultMessage: 'Golden signals',
            })}
          />
        }
        paddingSize="s"
        data-test-subj="entityCentricLabOverviewGoldenSignals"
      >
        {metrics && (primaryA || primaryB || primaryC) ? (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" responsive={false} wrap>
              {primaryA ? (
                <EuiFlexItem style={{ minWidth: 220 }}>
                  <MetricChartCard series={primaryA} events={events} />
                </EuiFlexItem>
              ) : null}
              {primaryB ? (
                <EuiFlexItem style={{ minWidth: 220 }}>
                  <MetricChartCard series={primaryB} events={events} />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            {primaryC ? (
              <>
                <EuiSpacer size="s" />
                <MetricChartCard series={primaryC} events={events} />
              </>
            ) : null}
          </>
        ) : null}

        {metrics && (otherA || otherB) ? (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" responsive={false} wrap>
              {otherA ? (
                <EuiFlexItem style={{ minWidth: 220 }}>
                  <MetricChartCard series={otherA} events={events} />
                </EuiFlexItem>
              ) : null}
              {otherB ? (
                <EuiFlexItem style={{ minWidth: 220 }}>
                  <MetricChartCard series={otherB} events={events} />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </>
        ) : null}
      </EuiAccordion>

      {!hideOwnership && (
        <>
          <EuiSpacer size="s" />

          <EuiAccordion
            id={ownershipAccordionId}
            initialIsOpen
            buttonContent={
              <SectionTitle
                title={i18n.translate('entityCentricLabFlyout.flyout.overview.ownershipTitle', {
                  defaultMessage: 'Ownership',
                })}
              />
            }
            paddingSize="s"
            data-test-subj="entityCentricLabOverviewOwnership"
          >
            <KeyValueGrid
              rows={overview.ownership}
              ariaLabel={i18n.translate(
                'entityCentricLabFlyout.flyout.overview.ownershipAriaLabel',
                { defaultMessage: 'Ownership' }
              )}
            />
          </EuiAccordion>
        </>
      )}
    </>
  );
};

const SectionTitle = ({ title, adornment }: { title: string; adornment?: React.ReactNode }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxs">
        <h3>{title}</h3>
      </EuiTitle>
    </EuiFlexItem>
    {adornment ? <EuiFlexItem grow={false}>{adornment}</EuiFlexItem> : null}
  </EuiFlexGroup>
);

const AssistanceSparklesIcon = () => {
  const { euiTheme } = useEuiTheme();
  return <EuiIcon type="sparkles" color={euiTheme.colors.textAssistance} aria-hidden={true} />;
};

const EntitySummaryCard = ({ overview }: { overview: EntityOverview }) => {
  const { euiTheme } = useEuiTheme();
  // Compact, neutral card with a slim assistance-tinted stripe on the left
  // edge — that's enough to read as AI-generated without flooding the panel
  // with purple. Section headers use small inline labels rather than full
  // paragraphs to keep the card tight.
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="s"
      css={css`
        position: relative;
        padding-left: ${euiTheme.size.l};
        &::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 3px;
          background-color: ${euiTheme.colors.backgroundFilledAssistance};
          border-top-left-radius: inherit;
          border-bottom-left-radius: inherit;
        }
      `}
      data-test-subj="entityCentricLabEntitySummaryCard"
    >
      <EuiText
        size="s"
        css={css`
          p,
          ul {
            margin-block-end: ${euiTheme.size.s};
          }
          ul {
            padding-inline-start: ${euiTheme.size.base};
          }
          li + li {
            margin-block-start: ${euiTheme.size.xs};
          }
        `}
      >
        <p data-test-subj="entityCentricLabSummaryHeadline">{overview.summary.headline}</p>
        {overview.summary.issues.length > 0 ? (
          <>
            <SummarySubheader>
              {i18n.translate('entityCentricLabFlyout.flyout.overview.issuesFound', {
                defaultMessage: '{count, plural, one {# issue found} other {# issues found}}',
                values: { count: overview.summary.issues.length },
              })}
            </SummarySubheader>
            <ul data-test-subj="entityCentricLabSummaryIssues">
              {overview.summary.issues.map((issue, idx) => (
                <li key={`issue-${idx}`}>{issue}</li>
              ))}
            </ul>
          </>
        ) : null}
        {overview.summary.nextSteps.length > 0 ? (
          <>
            <SummarySubheader>
              {i18n.translate('entityCentricLabFlyout.flyout.overview.suggestedNextSteps', {
                defaultMessage: 'Suggested next steps',
              })}
            </SummarySubheader>
            <ul data-test-subj="entityCentricLabSummaryNextSteps">
              {overview.summary.nextSteps.map((step, idx) => (
                <li key={`step-${idx}`}>{step}</li>
              ))}
            </ul>
          </>
        ) : null}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.translate('entityCentricLabFlyout.flyout.overview.summaryGeneratedAt', {
              defaultMessage: 'Generated on {generatedAt}',
              values: { generatedAt: overview.summary.generatedAt },
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="refresh"
            size="xs"
            css={css`
              color: ${euiTheme.colors.textAssistance};
            `}
            aria-label={i18n.translate(
              'entityCentricLabFlyout.flyout.overview.regenerateSummaryAriaLabel',
              { defaultMessage: 'Regenerate summary' }
            )}
            data-test-subj="entityCentricLabSummaryRegenerate"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const SummarySubheader = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <p
      css={css`
        color: ${euiTheme.colors.textHeading};
        font-weight: ${euiTheme.font.weight.semiBold};
        font-size: ${euiTheme.size.m};
        margin-block-start: ${euiTheme.size.s};
      `}
    >
      {children}
    </p>
  );
};

type FlyoutDensity = 'compact' | 'normal' | 'expanded';

const goldenSignalTileLayout = (density: FlyoutDensity | undefined) => {
  switch (density) {
    case 'expanded':
      return { height: 88, minWidth: 160, titlePx: 12, valuePx: 20, extraPx: 11, padPx: 6 };
    case 'normal':
      return { height: 80, minWidth: 148, titlePx: 11, valuePx: 18, extraPx: 10, padPx: 5 };
    case 'compact':
    default:
      return { height: 72, minWidth: 132, titlePx: 11, valuePx: 16, extraPx: 10, padPx: 4 };
  }
};

// Muted severity colours from the EUI primitive *40/*30 palette scale.
const goldenSignalTileBackground = (
  level: GoldenSignalLevel,
  _euiTheme: EuiThemeComputed
): string => {
  switch (level) {
    case 'warning':
      return '#FCD883'; // yellow30
    case 'danger':
      return '#FFB5AD'; // red40
    case 'success':
      return '#88E3C3'; // green40
  }
};

const GoldenSignalsRow = ({ signals }: { signals: readonly GoldenSignal[] }) => {
  const { density } = useEntityFlyoutServices();
  const layout = goldenSignalTileLayout(density);
  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
      {signals.map((signal) => (
        <EuiFlexItem key={signal.id} style={{ minWidth: layout.minWidth }}>
          <GoldenSignalCard signal={signal} layout={layout} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

const GoldenSignalCard = ({
  signal,
  layout,
}: {
  signal: GoldenSignal;
  layout: ReturnType<typeof goldenSignalTileLayout>;
}) => {
  const { euiTheme } = useEuiTheme();
  const { charts } = useEntityFlyoutServices();
  // Hosting plugin guarantees `charts` is wired through, so the base theme is
  // always available — we don't need to fall back to `@kbn/charts-theme`.
  const chartBaseTheme = charts.theme.useChartsBaseTheme();

  const datum: MetricDatum = {
    title: signal.label,
    // Pre-formatted string so elastic-charts doesn't split digits vs units
    // (numeric `value` + valueFormatter makes units render larger than digits).
    value: formatGoldenSignalValue(signal),
    extra: <span>{signal.delta}</span>,
    color: goldenSignalTileBackground(signal.color, euiTheme),
    trend: signal.trend.map((y, x) => ({ x, y })),
    trendShape: MetricTrendShape.Area,
    trendA11yTitle: signal.label,
    trendA11yDescription: explainFlyoutMetric(signal.description),
  };

  return (
    <div
      role="group"
      aria-label={signal.label}
      css={css`
        position: relative;
        height: ${layout.height}px;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.small};
        overflow: hidden;

        .echMetricText {
          padding: ${layout.padPx}px ${layout.padPx + 2}px !important;
        }
        .echMetricText__title {
          font-size: ${layout.titlePx}px !important;
          font-weight: ${euiTheme.font.weight.semiBold} !important;
          line-height: 1.2 !important;
        }
        .echMetricText__value {
          font-size: ${layout.valuePx}px !important;
          font-weight: ${euiTheme.font.weight.bold} !important;
          line-height: 1.15 !important;
        }
        .echMetricText__extra,
        .echMetricText__extraBlock .echMetricText__extra {
          font-weight: ${euiTheme.font.weight.medium} !important;
        }
        .echMetricText__part {
          font-size: inherit !important;
          font-weight: inherit;
        }
        .echMetricText__extraBlock {
          font-size: ${layout.extraPx}px !important;
          line-height: 1.2 !important;
        }
      `}
      data-test-subj={`entityCentricLabGoldenSignalCard-${signal.id}`}
    >
      <Chart>
        <Settings baseTheme={chartBaseTheme} locale={i18n.getLocale()} />
        <Metric id={`entityCentricLab-goldenSignal-${signal.id}`} data={[[datum]]} />
      </Chart>
      <span
        css={css`
          position: absolute;
          top: ${euiTheme.size.xs};
          right: ${euiTheme.size.xs};
          z-index: 1;
        `}
      >
        <EuiIconTip
          type="info"
          size="s"
          color="subdued"
          position="left"
          content={explainFlyoutMetric(signal.description)}
          aria-label={i18n.translate('entityCentricLabFlyout.flyout.overview.metricInfoAriaLabel', {
            defaultMessage: 'About {metric}',
            values: { metric: signal.label },
          })}
          anchorProps={{
            'data-test-subj': `entityCentricLabGoldenSignalInfo-${signal.id}`,
          }}
        />
      </span>
    </div>
  );
};

const KeyValueGrid = ({
  rows,
  ariaLabel,
}: {
  rows: readonly { id: string; label: string; value: string }[];
  ariaLabel: string;
}) => (
  <EuiPanel hasBorder hasShadow={false} paddingSize="s">
    <EuiFlexGrid columns={3} gutterSize="s" aria-label={ariaLabel}>
      {rows.map((row) => (
        <EuiFlexItem key={row.id}>
          <EuiText size="xs" color="subdued">
            {row.label}
          </EuiText>
          <EuiText size="s">
            <strong>{row.value}</strong>
          </EuiText>
        </EuiFlexItem>
      ))}
    </EuiFlexGrid>
  </EuiPanel>
);
