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
  EuiHorizontalRule,
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
import { useDiscoverServices } from '../../hooks/use_discover_services';
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
            title={i18n.translate('discover.entityCentricLab.flyout.overview.entitySummaryTitle', {
              defaultMessage: 'Entity Summary',
            })}
            adornment={<AssistanceSparklesIcon />}
          />
        }
        extraAction={<SectionMenuButton sectionLabel="entitySummary" />}
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
            title={i18n.translate('discover.entityCentricLab.flyout.overview.goldenSignalsTitle', {
              defaultMessage: 'Golden signals',
            })}
          />
        }
        extraAction={<SectionMenuButton sectionLabel="goldenSignals" />}
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
            title={i18n.translate('discover.entityCentricLab.flyout.overview.entityDetailsTitle', {
              defaultMessage: 'Entity details',
            })}
          />
        }
        extraAction={<SectionMenuButton sectionLabel="entityDetails" />}
        paddingSize="s"
        data-test-subj="entityCentricLabOverviewEntityDetails"
      >
        <KeyValueGrid
          rows={overview.details}
          ariaLabel={i18n.translate(
            'discover.entityCentricLab.flyout.overview.entityDetailsAriaLabel',
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
            title={i18n.translate('discover.entityCentricLab.flyout.overview.ownershipTitle', {
              defaultMessage: 'Ownership',
            })}
          />
        }
        extraAction={<SectionMenuButton sectionLabel="ownership" />}
        paddingSize="s"
        data-test-subj="entityCentricLabOverviewOwnership"
      >
        <KeyValueGrid
          rows={overview.ownership}
          ariaLabel={i18n.translate(
            'discover.entityCentricLab.flyout.overview.ownershipAriaLabel',
            {
              defaultMessage: 'Ownership',
            }
          )}
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

const SectionMenuButton = ({ sectionLabel }: { sectionLabel: string }) => (
  <EuiButtonIcon
    iconType="boxesVertical"
    color="text"
    aria-label={i18n.translate('discover.entityCentricLab.flyout.overview.sectionMenuAriaLabel', {
      defaultMessage: 'Open section actions',
    })}
    data-test-subj={`entityCentricLabSectionMenu-${sectionLabel}`}
  />
);

const AssistanceSparklesIcon = () => {
  const { euiTheme } = useEuiTheme();
  return <EuiIcon type="sparkles" color={euiTheme.colors.textAssistance} aria-hidden={true} />;
};

const EntitySummaryCard = ({ overview }: { overview: EntityOverview }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      // Assistance-tinted backdrop ties the AI summary card to the `sparkles`
      // section adornment and the `assistance`-colored refresh affordance below
      // (canonical Borealis purple palette dedicated to AI-generated content).
      css={css`
        background-color: ${euiTheme.colors.backgroundLightAssistance};
        border-color: ${euiTheme.colors.borderBaseAssistance};
      `}
      data-test-subj="entityCentricLabEntitySummaryCard"
    >
      <EuiText size="s">
        <p>{overview.summary.text}</p>
      </EuiText>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {i18n.translate('discover.entityCentricLab.flyout.overview.summaryGeneratedAt', {
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
              'discover.entityCentricLab.flyout.overview.regenerateSummaryAriaLabel',
              { defaultMessage: 'Regenerate summary' }
            )}
            data-test-subj="entityCentricLabSummaryRegenerate"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
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
  const { charts } = useDiscoverServices();
  // Discover plugin entry already depends on `charts`, so the start contract
  // is guaranteed at this point — pulling the base theme through it keeps us
  // off the (currently un-referenced) `@kbn/charts-theme` package.
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
