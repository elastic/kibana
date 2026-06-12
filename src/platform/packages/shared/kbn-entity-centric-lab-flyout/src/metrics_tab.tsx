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
import { useEntityFlyoutServices } from './services_context';
import type { MetricEvent, MetricSeries, MetricsTabData } from './fake_entity_tabs';
import { formatIncidentTick } from './time_domain';

interface MetricsTabProps {
  readonly metrics: MetricsTabData;
}

const NO_EVENTS: readonly MetricEvent[] = [];

export const MetricsTab = ({ metrics }: MetricsTabProps) => {
  const goldenAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabMetricsGolden' });
  const otherAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabMetricsOther' });
  const [surfaceEvents, setSurfaceEvents] = useState(true);
  const events = surfaceEvents ? metrics.events : NO_EVENTS;

  // Layout follows the design: latency + error rate side-by-side, throughput
  // full-width below them.
  const [primaryA, primaryB, primaryC] = metrics.goldenSignals;
  const [otherA, otherB] = metrics.otherMetrics;

  return (
    <>
      <EuiSwitch
        label={i18n.translate('entityCentricLabFlyout.flyout.metrics.surfaceEventsToggle', {
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
              {i18n.translate('entityCentricLabFlyout.flyout.metrics.goldenSignalsTitle', {
                defaultMessage: 'Golden signals',
              })}
            </h3>
          </EuiTitle>
        }
        paddingSize="s"
        data-test-subj="entityCentricLabMetricsGoldenSignals"
      >
        <EuiFlexGroup gutterSize="m" responsive={false} wrap>
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
        <EuiSpacer size="m" />
        {primaryC ? <MetricChartCard series={primaryC} events={events} /> : null}
      </EuiAccordion>

      <EuiSpacer size="m" />

      <EuiAccordion
        id={otherAccordionId}
        initialIsOpen
        buttonContent={
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('entityCentricLabFlyout.flyout.metrics.otherSectionTitle', {
                defaultMessage: 'Other section with more metrics',
              })}
            </h3>
          </EuiTitle>
        }
        paddingSize="s"
        data-test-subj="entityCentricLabMetricsOtherSection"
      >
        <EuiFlexGroup gutterSize="m" responsive={false} wrap>
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
      </EuiAccordion>
    </>
  );
};

const CHART_HEIGHT = 200;

const MetricChartCard = ({
  series,
  events,
}: {
  readonly series: MetricSeries;
  readonly events: readonly MetricEvent[];
}) => {
  const { euiTheme } = useEuiTheme();
  const { charts } = useEntityFlyoutServices();
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
              iconType="question"
              color="text"
              aria-label={i18n.translate(
                'entityCentricLabFlyout.flyout.metrics.descriptionAriaLabel',
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
            tickFormat={(value) => formatIncidentTick(Number(value))}
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
          {events.length > 0 ? (
            <LineAnnotation
              id={`${series.id}-events`}
              domainType={AnnotationDomainType.XDomain}
              // `header` + `details` are picked up by the built-in annotation
              // tooltip on hover — that's how the demo surfaces the deployment
              // story (e.g. "Deployment — payments-service v2.14.3").
              dataValues={events.map((event) => ({
                dataValue: event.x,
                header: event.header,
                details: event.details,
              }))}
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
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              data={line.points as Array<{ x: number; y: number }>}
              color={chartLineColor(idx, euiTheme)}
              // Pin time axis to UTC so deploy marker (02:46:41 UTC) and the
              // spike that follows it sit under labels matching the AI summary.
              timeZone="utc"
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
