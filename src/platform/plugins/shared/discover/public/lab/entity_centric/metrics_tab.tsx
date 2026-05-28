/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiThemeComputed,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  AnnotationDomainType,
  Axis,
  Chart,
  LineAnnotation,
  LineSeries,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { MetricSeries, MetricsTabData } from './fake_entity_tabs';

interface MetricsTabProps {
  readonly metrics: MetricsTabData;
}

export const MetricsTab = ({ metrics }: MetricsTabProps) => {
  const goldenAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabMetricsGolden' });
  const otherAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabMetricsOther' });
  const [surfaceEvents, setSurfaceEvents] = useState(true);
  const eventPositions = surfaceEvents ? metrics.eventPositions : [];

  // Layout follows the design: latency + error rate side-by-side, throughput
  // full-width below them.
  const [primaryA, primaryB, primaryC] = metrics.goldenSignals;
  const [otherA, otherB] = metrics.otherMetrics;

  return (
    <>
      <EuiSwitch
        label={i18n.translate('discover.entityCentricLab.flyout.metrics.surfaceEventsToggle', {
          defaultMessage: 'Surface events on graphs',
        })}
        checked={surfaceEvents}
        onChange={(e) => setSurfaceEvents(e.target.checked)}
        data-test-subj="entityCentricLabMetricsSurfaceEventsToggle"
      />
      <EuiSpacer size="m" />

      <EuiAccordion
        id={goldenAccordionId}
        initialIsOpen
        buttonContent={
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('discover.entityCentricLab.flyout.metrics.goldenSignalsTitle', {
                defaultMessage: 'Golden signals',
              })}
            </h3>
          </EuiTitle>
        }
        extraAction={<SectionMenuButton sectionLabel="goldenSignals" />}
        paddingSize="s"
        data-test-subj="entityCentricLabMetricsGoldenSignals"
      >
        <EuiFlexGroup gutterSize="m" responsive={false} wrap>
          {primaryA ? (
            <EuiFlexItem style={{ minWidth: 220 }}>
              <MetricChartCard series={primaryA} eventPositions={eventPositions} />
            </EuiFlexItem>
          ) : null}
          {primaryB ? (
            <EuiFlexItem style={{ minWidth: 220 }}>
              <MetricChartCard series={primaryB} eventPositions={eventPositions} />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {primaryC ? <MetricChartCard series={primaryC} eventPositions={eventPositions} /> : null}
      </EuiAccordion>

      <EuiSpacer size="m" />

      <EuiAccordion
        id={otherAccordionId}
        initialIsOpen
        buttonContent={
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('discover.entityCentricLab.flyout.metrics.otherSectionTitle', {
                defaultMessage: 'Other section with more metrics',
              })}
            </h3>
          </EuiTitle>
        }
        extraAction={<SectionMenuButton sectionLabel="otherMetrics" />}
        paddingSize="s"
        data-test-subj="entityCentricLabMetricsOtherSection"
      >
        <EuiFlexGroup gutterSize="m" responsive={false} wrap>
          {otherA ? (
            <EuiFlexItem style={{ minWidth: 220 }}>
              <MetricChartCard series={otherA} eventPositions={eventPositions} />
            </EuiFlexItem>
          ) : null}
          {otherB ? (
            <EuiFlexItem style={{ minWidth: 220 }}>
              <MetricChartCard series={otherB} eventPositions={eventPositions} />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiAccordion>
    </>
  );
};

const SectionMenuButton = ({ sectionLabel }: { sectionLabel: string }) => (
  <EuiButtonIcon
    iconType="boxesVertical"
    color="text"
    aria-label={i18n.translate('discover.entityCentricLab.flyout.metrics.sectionMenuAriaLabel', {
      defaultMessage: 'Open section actions',
    })}
    data-test-subj={`entityCentricLabMetricsSectionMenu-${sectionLabel}`}
  />
);

const CHART_HEIGHT = 200;

const MetricChartCard = ({
  series,
  eventPositions,
}: {
  readonly series: MetricSeries;
  readonly eventPositions: readonly number[];
}) => {
  const { euiTheme } = useEuiTheme();
  const { charts } = useDiscoverServices();
  const chartBaseTheme = charts.theme.useChartsBaseTheme();
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{series.label}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={series.description} position="top" delay="long">
            <EuiButtonIcon
              iconType="questionInCircle"
              color="text"
              aria-label={i18n.translate(
                'discover.entityCentricLab.flyout.metrics.descriptionAriaLabel',
                { defaultMessage: 'Show metric description' }
              )}
              data-test-subj={`entityCentricLabMetricsDescription-${series.id}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div
        style={{ height: CHART_HEIGHT }}
        data-test-subj={`entityCentricLabMetricsChart-${series.id}`}
      >
        <Chart>
          <Settings baseTheme={chartBaseTheme} locale={i18n.getLocale()} showLegend={false} />
          <Axis
            id={`${series.id}-x`}
            position={Position.Bottom}
            tickFormat={(value) =>
              `${String(10 + Math.round(Number(value) / 2)).padStart(2, '0')}:00:00`
            }
          />
          <Axis id={`${series.id}-y`} position={Position.Left} />
          {series.threshold !== undefined ? (
            <LineAnnotation
              id={`${series.id}-threshold`}
              domainType={AnnotationDomainType.YDomain}
              dataValues={[{ dataValue: series.threshold }]}
              style={{
                line: {
                  stroke: euiTheme.colors.danger,
                  strokeWidth: 1,
                  opacity: 0.5,
                  dash: [4, 4],
                },
              }}
            />
          ) : null}
          {eventPositions.length > 0 ? (
            <LineAnnotation
              id={`${series.id}-events`}
              domainType={AnnotationDomainType.XDomain}
              dataValues={eventPositions.map((x) => ({ dataValue: x }))}
              marker={<EventDiamond euiTheme={euiTheme} />}
              markerPosition={Position.Bottom}
              style={{
                line: { stroke: euiTheme.colors.accent, strokeWidth: 1.5, opacity: 0.8 },
              }}
            />
          ) : null}
          {series.series.map((line, idx) => (
            <LineSeries
              key={line.id}
              id={line.id}
              name={line.label}
              xScaleType={ScaleType.Linear}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              data={line.points as Array<{ x: number; y: number }>}
              color={chartLineColor(idx, euiTheme)}
            />
          ))}
        </Chart>
      </div>
      {series.series.length > 0 ? (
        <EuiFlexGroup gutterSize="m" responsive={false} wrap>
          {series.series.map((line, idx) => (
            <EuiFlexItem grow={false} key={line.id}>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <span
                    aria-hidden
                    css={css`
                      width: 8px;
                      height: 8px;
                      border-radius: 50%;
                      background-color: ${chartLineColor(idx, euiTheme)};
                      display: inline-block;
                    `}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {line.label}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ) : null}
    </EuiPanel>
  );
};

const chartLineColor = (idx: number, euiTheme: EuiThemeComputed): string => {
  // First series uses the EUI vis-1 palette colour (teal-like), second uses
  // vis-2 — close enough to the design without pulling in the chart palette.
  const palette = [
    euiTheme.colors.vis.euiColorVis0,
    euiTheme.colors.vis.euiColorVis1,
    euiTheme.colors.vis.euiColorVis2,
  ];
  return palette[idx % palette.length];
};

const EventDiamond = ({ euiTheme }: { euiTheme: EuiThemeComputed }) => (
  <span
    aria-hidden
    css={css`
      width: 10px;
      height: 10px;
      background-color: ${euiTheme.colors.accent};
      transform: rotate(45deg);
      display: block;
    `}
  />
);
