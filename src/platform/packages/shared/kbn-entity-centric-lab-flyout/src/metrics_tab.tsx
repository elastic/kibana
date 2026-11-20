/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, useMemo, useRef, useState } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
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
  Heatmap,
  LineAnnotation,
  LineSeries,
  Position,
  Predicate,
  ScaleType,
  Settings,
  Tooltip,
  TooltipContainer,
  TooltipHeader,
  type RecursivePartial,
  type HeatmapStyle,
} from '@elastic/charts';
import { useActiveCursor } from '@kbn/charts-plugin/public';
import { useEntityFlyoutServices } from './services_context';
import type { MetricEvent, MetricSeries, MetricsTabData } from './fake_entity_tabs';
import {
  formatIncidentTick,
  incidentShiftMs,
  phaseBucketsForRange,
  windowPoints,
} from './time_domain';
import { useResolvedFlyoutTimeRange } from './time_range_context';

interface MetricsTabProps {
  readonly metrics: MetricsTabData;
  readonly hideEvents?: boolean;
}

const NO_EVENTS: readonly MetricEvent[] = [];

/** What a flyout metric number and its chart are, in plain language. */
export const explainFlyoutMetric = (what: string): string =>
  i18n.translate('entityCentricLabFlyout.flyout.metrics.plainExplanation', {
    defaultMessage:
      '{what} Shows the latest value in the selected time range, with the trend charted over that range.',
    values: { what },
  });

export const MetricsTab = ({ metrics, hideEvents = false }: MetricsTabProps) => {
  const goldenAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabMetricsGolden' });
  const otherAccordionId = useGeneratedHtmlId({ prefix: 'entityCentricLabMetricsOther' });
  const [surfaceEvents, setSurfaceEvents] = useState(!hideEvents);
  const events = hideEvents ? NO_EVENTS : surfaceEvents ? metrics.events : NO_EVENTS;

  // Layout follows the design: latency + error rate side-by-side, throughput
  // full-width below them.
  const [primaryA, primaryB, primaryC] = metrics.goldenSignals;
  const [otherA, otherB] = metrics.otherMetrics;

  return (
    <>
      {hideEvents ? null : (
        <EuiSwitch
          label={i18n.translate('entityCentricLabFlyout.flyout.metrics.surfaceEventsToggle', {
            defaultMessage: 'Surface events on graphs',
          })}
          checked={surfaceEvents}
          onChange={(e) => setSurfaceEvents(e.target.checked)}
          data-test-subj="entityCentricLabMetricsSurfaceEventsToggle"
        />
      )}
      {hideEvents ? null : <EuiSpacer size="s" />}

      <EuiAccordion
        id={goldenAccordionId}
        initialIsOpen
        buttonContent={
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('entityCentricLabFlyout.flyout.metrics.goldenSignalsTitle', {
                defaultMessage: 'Golden signals over time',
              })}
            </h3>
          </EuiTitle>
        }
        paddingSize="s"
        data-test-subj="entityCentricLabMetricsGoldenSignals"
      >
        <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
          {primaryA ? (
            <EuiFlexItem style={{ minWidth: 200 }}>
              <MetricChartCard series={primaryA} events={events} />
            </EuiFlexItem>
          ) : null}
          {primaryB ? (
            <EuiFlexItem style={{ minWidth: 200 }}>
              <MetricChartCard series={primaryB} events={events} />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        {primaryC ? <MetricChartCard series={primaryC} events={events} /> : null}
        {metrics.goldenSignals.slice(3).map((extra) => (
          <Fragment key={extra.id}>
            <EuiSpacer size="xs" />
            <MetricChartCard series={extra} events={events} />
          </Fragment>
        ))}
      </EuiAccordion>

      <EuiSpacer size="s" />

      <EuiAccordion
        id={otherAccordionId}
        initialIsOpen
        buttonContent={
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('entityCentricLabFlyout.flyout.metrics.otherSectionTitle', {
                defaultMessage: 'Infrastructure metrics',
              })}
            </h3>
          </EuiTitle>
        }
        paddingSize="s"
        data-test-subj="entityCentricLabMetricsOtherSection"
      >
        <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
          {otherA ? (
            <EuiFlexItem style={{ minWidth: 200 }}>
              <MetricChartCard series={otherA} events={events} />
            </EuiFlexItem>
          ) : null}
          {otherB ? (
            <EuiFlexItem style={{ minWidth: 200 }}>
              <MetricChartCard series={otherB} events={events} />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiAccordion>
    </>
  );
};

type FlyoutChartDensity = 'compact' | 'normal' | 'expanded';

const metricChartHeight = (density: FlyoutChartDensity | undefined): number => {
  switch (density) {
    case 'expanded':
      return 188;
    case 'normal':
      return 168;
    case 'compact':
    default:
      return 152;
  }
};

export const MetricChartCard = ({
  series,
  events,
}: {
  readonly series: MetricSeries;
  readonly events: readonly MetricEvent[];
}) => {
  const { euiTheme } = useEuiTheme();
  const { charts, density } = useEntityFlyoutServices();
  const timeRange = useResolvedFlyoutTimeRange();
  const yLabels = series.yLabels;
  const chartSeries = useMemo(() => {
    if (!timeRange) return series;
    return {
      ...series,
      series: series.series.map((line) => ({
        ...line,
        points: yLabels
          ? phaseBucketsForRange(line.points, timeRange)
          : windowPoints(line.points, timeRange),
      })),
    };
  }, [series, timeRange, yLabels]);
  const chartEvents = useMemo(() => {
    if (!timeRange) return events;
    const shift = incidentShiftMs(timeRange);
    return events.flatMap((event) => {
      const x = event.x + shift;
      if (x < timeRange.startMs || x > timeRange.endMs) return [];
      return [{ ...event, x }];
    });
  }, [events, timeRange]);
  const chartHeight = yLabels ? 112 : metricChartHeight(density);
  const chartBaseTheme = charts.theme.useChartsBaseTheme();
  // Shared cursor so hovering one chart draws a synced vertical guide on
  // every other chart in the tab (and any other chart in Kibana that
  // subscribes to the same `activeCursor` service). All charts here use
  // a time X-axis with the same domain, so `isDateHistogram: true` is
  // enough — no explicit accessors needed. `chartRef` gets forwarded to
  // `<Chart>` so the hook can dispatch external pointer events into it.
  const chartRef = useRef<Chart | null>(null);
  const handleCursorUpdate = useActiveCursor(charts.activeCursor, chartRef, {
    isDateHistogram: true,
  });
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="xs">
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{series.label}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type="info"
            size="s"
            color="subdued"
            position="left"
            content={explainFlyoutMetric(series.description)}
            aria-label={i18n.translate(
              'entityCentricLabFlyout.flyout.metrics.descriptionAriaLabel',
              {
                defaultMessage: 'About {metric}',
                values: { metric: series.label },
              }
            )}
            anchorProps={{
              'data-test-subj': `entityCentricLabMetricsDescription-${series.id}`,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <div
        style={{ height: chartHeight }}
        data-test-subj={`entityCentricLabMetricsChart-${series.id}`}
      >
        {yLabels ? (
          <PhaseHeatmap
            series={chartSeries}
            yLabels={yLabels}
            chartRef={chartRef}
            onPointerUpdate={handleCursorUpdate}
            baseTheme={chartBaseTheme}
            euiTheme={euiTheme}
          />
        ) : (
          <Chart ref={chartRef}>
            <Settings
              baseTheme={chartBaseTheme}
              locale={i18n.getLocale()}
              showLegend={false}
              onPointerUpdate={handleCursorUpdate}
              xDomain={
                timeRange ? { min: timeRange.startMs, max: timeRange.endMs } : undefined
              }
            />
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
            {chartEvents.length > 0 ? (
              <LineAnnotation
                id={`${series.id}-events`}
                domainType={AnnotationDomainType.XDomain}
                // `header` + `details` are picked up by the built-in annotation
                // tooltip on hover — that's how the demo surfaces the deployment
                // story (e.g. "Deployment — payments-service v2.14.3").
                dataValues={chartEvents.map((event) => ({
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
            {chartSeries.series.map((line, idx) => (
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
        )}
      </div>
      {yLabels ? (
        <PhaseLegend
          labels={yLabels}
          points={chartSeries.series[0]?.points ?? []}
          euiTheme={euiTheme}
        />
      ) : series.series.length > 0 ? (
        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
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

const phaseColor = (label: string, euiTheme: EuiThemeComputed): string => {
  switch (label) {
    case 'Running':
      return euiTheme.colors.success;
    case 'Succeeded':
      return euiTheme.colors.primary;
    case 'Pending':
      return euiTheme.colors.warning;
    case 'Failed':
      return euiTheme.colors.danger;
    default:
      return euiTheme.colors.mediumShade;
  }
};

const phaseHeatmapTheme = (euiTheme: EuiThemeComputed): RecursivePartial<HeatmapStyle> => ({
  // Gap is an inset grid stroke. A border stroke is centered on the cell
  // edge, so the last rectangle paints past the panel and gets clipped.
  grid: { stroke: { width: 2, color: euiTheme.colors.emptyShade } },
  cell: {
    maxWidth: 'fill',
    maxHeight: 'fill',
    label: { visible: false },
    border: { strokeWidth: 0 },
  },
  yAxisLabel: { visible: false },
});

/**
 * One colored rectangle per time bucket. The color is the pod phase at that
 * time, so a stretch of Running stays green until the phase changes.
 */
const PhaseHeatmap = ({
  series,
  yLabels,
  chartRef,
  onPointerUpdate,
  baseTheme,
  euiTheme,
}: {
  readonly series: MetricSeries;
  readonly yLabels: readonly string[];
  readonly chartRef: React.Ref<Chart>;
  readonly onPointerUpdate: NonNullable<React.ComponentProps<typeof Settings>['onPointerUpdate']>;
  readonly baseTheme: React.ComponentProps<typeof Settings>['baseTheme'];
  readonly euiTheme: EuiThemeComputed;
}) => {
  const points = series.series[0]?.points ?? [];
  const data = points.map((point) => ({
    x: point.x,
    y: 'phase',
    value: point.y,
  }));
  const bands = [
    {
      start: Number.NEGATIVE_INFINITY,
      end: -0.5,
      color: euiTheme.colors.lightestShade,
      label: '',
    },
    ...yLabels.map((label, index) => ({
      start: index - 0.5,
      end: index === yLabels.length - 1 ? Number.POSITIVE_INFINITY : index + 0.5,
      color: phaseColor(label, euiTheme),
      label,
    })),
  ];
  return (
    <Chart ref={chartRef}>
      <Settings
        baseTheme={baseTheme}
        locale={i18n.getLocale()}
        showLegend={false}
        onPointerUpdate={onPointerUpdate}
        theme={{
          chartPaddings: { left: 0, right: 8, top: 0, bottom: 0 },
          heatmap: phaseHeatmapTheme(euiTheme),
        }}
      />
      <Tooltip
        customTooltip={({ values }) => {
          const datum = values[0]?.datum as { x?: number; value?: number } | undefined;
          if (!datum || datum.value === undefined) return null;
          if (datum.value < 0) {
            return (
              <TooltipContainer>
                {datum.x !== undefined ? (
                  <TooltipHeader>{formatIncidentTick(datum.x)}</TooltipHeader>
                ) : null}
                <div className="echTooltip__metricRow">
                  {i18n.translate('entityCentricLabFlyout.flyout.metrics.phaseNoData', {
                    defaultMessage: 'No data',
                  })}
                </div>
              </TooltipContainer>
            );
          }
          const label = yLabels[Math.round(datum.value)] ?? '';
          return (
            <TooltipContainer>
              {datum.x !== undefined ? (
                <TooltipHeader>{formatIncidentTick(datum.x)}</TooltipHeader>
              ) : null}
              <div className="echTooltip__metricRow">
                <span
                  aria-hidden
                  css={css`
                    width: 8px;
                    height: 8px;
                    border-radius: 2px;
                    background-color: ${phaseColor(label, euiTheme)};
                    display: inline-block;
                    margin-right: 6px;
                  `}
                />
                {label}
              </div>
            </TooltipContainer>
          );
        }}
      />
      <Heatmap
        id={`${series.id}-status`}
        colorScale={{ type: 'bands', bands }}
        data={data}
        xAccessor="x"
        yAccessor="y"
        valueAccessor="value"
        valueFormatter={(value) => yLabels[Math.round(Number(value))] ?? ''}
        xSortPredicate={Predicate.NumAsc}
        // Ordinal, not a time scale: each sample is one rectangle. A time
        // scale snaps buckets to the interval and then drops cells whose
        // timestamp is not on that grid.
        xScale={{ type: ScaleType.Ordinal }}
        xAxisLabelFormatter={(value) => {
          const index = data.findIndex((point) => point.x === Number(value));
          if (index < 0 || index % 4 !== 0) return '';
          return formatIncidentTick(Number(value));
        }}
        timeZone="utc"
        xAxisLabelName=""
        yAxisLabelName=""
      />
    </Chart>
  );
};

const PhaseLegend = ({
  labels,
  points,
  euiTheme,
}: {
  readonly labels: readonly string[];
  readonly points: ReadonlyArray<{ readonly y: number }>;
  readonly euiTheme: EuiThemeComputed;
}) => {
  const present = new Set(points.map((point) => Math.round(point.y)));
  const shown = labels.filter((_, index) => present.has(index));
  if (shown.length === 0) return null;
  return (
    <EuiFlexGroup gutterSize="s" responsive={false} wrap>
      {shown.map((label) => (
        <EuiFlexItem grow={false} key={label}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <span
                aria-hidden
                css={css`
                  width: 10px;
                  height: 10px;
                  border-radius: 2px;
                  background-color: ${phaseColor(label, euiTheme)};
                  display: inline-block;
                `}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {label}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
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
