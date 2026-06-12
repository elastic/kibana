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
  EuiText,
  EuiTitle,
  EuiToolTip,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiThemeComputed,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { MetricDatum } from '@elastic/charts';
import { Chart, Metric, MetricTrendShape, Settings } from '@elastic/charts';
import { useEntityFlyoutServices } from './services_context';
import type { EntityOverview, GoldenSignal, GoldenSignalLevel } from './fake_entity_overview';
import { formatGoldenSignalValue } from './fake_entity_overview';

interface OverviewTabProps {
  readonly overview: EntityOverview;
}

export const OverviewTab = ({ overview }: OverviewTabProps) => {
  const summaryAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabSummary' });
  const signalsAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabSignals' });
  const detailsAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabDetails' });
  const ownershipAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabOwnership' });

  return (
    <>
      <EuiAccordion
        id={summaryAccordionId}
        initialIsOpen
        buttonContent={
          <SectionTitle
            title={i18n.translate('entityCentricLabFlyout.flyout.overview.entitySummaryTitle', {
              defaultMessage: 'Entity Summary',
            })}
            adornment={<AssistanceSparklesIcon />}
          />
        }
        paddingSize="s"
        data-test-subj="entityCentricLabOverviewEntitySummary"
      >
        <EntitySummaryCard overview={overview} />
      </EuiAccordion>

      <EuiSpacer size="m" />

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
        <GoldenSignalsRow signals={overview.goldenSignals} />
      </EuiAccordion>

      <EuiSpacer size="m" />

      <EuiAccordion
        id={detailsAccordionId}
        initialIsOpen
        buttonContent={
          <SectionTitle
            title={i18n.translate('entityCentricLabFlyout.flyout.overview.entityDetailsTitle', {
              defaultMessage: 'Entity details',
            })}
          />
        }
        paddingSize="s"
        data-test-subj="entityCentricLabOverviewEntityDetails"
      >
        <KeyValueGrid
          rows={overview.details}
          ariaLabel={i18n.translate(
            'entityCentricLabFlyout.flyout.overview.entityDetailsAriaLabel',
            { defaultMessage: 'Entity details' }
          )}
        />
      </EuiAccordion>

      <EuiSpacer size="m" />

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
          ariaLabel={i18n.translate('entityCentricLabFlyout.flyout.overview.ownershipAriaLabel', {
            defaultMessage: 'Ownership',
          })}
        />
      </EuiAccordion>
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
      paddingSize="m"
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

const GOLDEN_SIGNAL_TILE_HEIGHT = 132;

// Soften the saturated severity palette into pastel backgrounds suitable for
// large filled tiles -- the hue stays recognisable while the value/chrome on
// top of the tile (delta, sparkline, big number) stays legible.
const GOLDEN_SIGNAL_TILE_ALPHA = 0.35;

const goldenSignalTileBackground = (
  level: GoldenSignalLevel,
  euiTheme: EuiThemeComputed
): string => {
  switch (level) {
    case 'warning':
      return transparentize(euiTheme.colors.severity.warning, GOLDEN_SIGNAL_TILE_ALPHA);
    case 'danger':
      return transparentize(euiTheme.colors.severity.danger, GOLDEN_SIGNAL_TILE_ALPHA);
    case 'success':
      return transparentize(euiTheme.colors.severity.success, GOLDEN_SIGNAL_TILE_ALPHA);
  }
};

const GoldenSignalsRow = ({ signals }: { signals: readonly GoldenSignal[] }) => (
  <EuiFlexGroup gutterSize="m" responsive={false} wrap>
    {signals.map((signal) => (
      <EuiFlexItem key={signal.id} style={{ minWidth: 180 }}>
        <GoldenSignalCard signal={signal} />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

const GoldenSignalCard = ({ signal }: { signal: GoldenSignal }) => {
  const { euiTheme } = useEuiTheme();
  const { charts } = useEntityFlyoutServices();
  // Hosting plugin guarantees `charts` is wired through, so the base theme is
  // always available — we don't need to fall back to `@kbn/charts-theme`.
  const chartBaseTheme = charts.theme.useChartsBaseTheme();

  const datum: MetricDatum = {
    title: signal.label,
    value: signal.value,
    valueFormatter: () => formatGoldenSignalValue(signal),
    extra: <span>{signal.delta}</span>,
    color: goldenSignalTileBackground(signal.color, euiTheme),
    trend: signal.trend.map((y, x) => ({ x, y })),
    trendShape: MetricTrendShape.Area,
    trendA11yTitle: signal.label,
    trendA11yDescription: signal.description,
  };

  return (
    <EuiToolTip content={signal.description} position="top" delay="long">
      {/* `tabIndex={0}` so keyboard users can also surface the tooltip — the
          metric tile itself is non-interactive. */}
      <div
        tabIndex={0}
        role="group"
        aria-label={signal.label}
        css={css`
          height: ${GOLDEN_SIGNAL_TILE_HEIGHT}px;
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
          overflow: hidden;
        `}
        data-test-subj={`entityCentricLabGoldenSignalCard-${signal.id}`}
      >
        <Chart>
          <Settings baseTheme={chartBaseTheme} locale={i18n.getLocale()} />
          <Metric id={`entityCentricLab-goldenSignal-${signal.id}`} data={[[datum]]} />
        </Chart>
      </div>
    </EuiToolTip>
  );
};

const KeyValueGrid = ({
  rows,
  ariaLabel,
}: {
  rows: readonly { id: string; label: string; value: string }[];
  ariaLabel: string;
}) => (
  <EuiPanel hasBorder hasShadow={false} paddingSize="m">
    <EuiFlexGrid columns={3} gutterSize="m" aria-label={ariaLabel}>
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
