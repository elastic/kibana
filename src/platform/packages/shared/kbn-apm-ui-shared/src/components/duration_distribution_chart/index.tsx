/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';

import type {
  BrushEndListener,
  LineAnnotationDatum,
  LineAnnotationStyle,
  TickFormatter,
} from '@elastic/charts';
import {
  AnnotationDomainType,
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  LineAnnotation,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
} from '@elastic/charts';

import { euiPaletteColorBlind, useEuiTheme } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { type HistogramItem, ProcessorEvent } from '@kbn/apm-types-shared';
import { ChartContainer } from './chart_container';
import { getDurationFormatter } from '../../utils';
import { useChartThemes } from '../../hooks/use_chart_theme';

const DEFAULT_PERCENTILE_THRESHOLD = 95;

const NUMBER_OF_TRANSACTIONS_LABEL = i18n.translate(
  'kbnApmUiShared.durationDistributionChart.numberOfTransactionsLabel',
  { defaultMessage: 'Transactions' }
);

const NUMBER_OF_SPANS_LABEL = i18n.translate(
  'kbnApmUiShared.durationDistributionChart.numberOfSpansLabel',
  { defaultMessage: 'Spans' }
);

export interface DurationDistributionChartData {
  id: string;
  histogram: HistogramItem[];
  areaSeriesColor: string;
}

interface DurationDistributionChartProps {
  data: DurationDistributionChartData[];
  hasData: boolean;
  markerCurrentEvent?: number;
  markerValue: number;
  onChartSelection?: BrushEndListener;
  selection?: [number, number];
  loading: boolean;
  hasError: boolean;
  eventType: ProcessorEvent.span | ProcessorEvent.transaction;
  dataTestSubPrefix?: string;
  showAxisTitle?: boolean;
  showLegend?: boolean;
  isOtelData?: boolean;
}

const getAnnotationsStyle = (color = 'gray'): LineAnnotationStyle => ({
  line: {
    strokeWidth: 1,
    stroke: color,
    opacity: 0.8,
  },
});

// With a log based y axis in combination with the `CURVE_STEP_AFTER` style,
// the line of an area would not go down to 0 but end on the y axis at the last value >0.
// By replacing the 0s with a small value >0 the line will be drawn as intended.
// This is just to visually fix the line, for tooltips, that number will be again rounded down to 0.
// Note this workaround is only safe to use for this type of chart because it works with
// count based values and not a float based metric for example on the y axis.
const Y_AXIS_MIN_DOMAIN = 0.5;
const Y_AXIS_MIN_VALUE = 0.0001;

export const replaceHistogramZerosWithMinimumDomainValue = (histogramItems: HistogramItem[]) => {
  return histogramItems.map((item) => {
    if (item.doc_count === 0) {
      item.doc_count = Y_AXIS_MIN_VALUE;
    }
    return item;
  });
};

// Create and call a duration formatter for every value since the durations for the
// x axis might have a wide range of values e.g. from low milliseconds to large seconds.
// This way we can get different suitable units across ticks.
const xAxisTickFormat: TickFormatter<number> = (d) => getDurationFormatter(d, 0.9999)(d).formatted;

export function DurationDistributionChart({
  data,
  hasData,
  markerCurrentEvent,
  markerValue,
  onChartSelection,
  selection,
  loading,
  hasError,
  eventType,
  dataTestSubPrefix,
  showAxisTitle = true,
  showLegend = true,
  isOtelData = false,
}: DurationDistributionChartProps) {
  const chartThemes = useChartThemes();
  const { euiTheme } = useEuiTheme();
  const markerPercentile = DEFAULT_PERCENTILE_THRESHOLD;

  const annotationsDataValues: LineAnnotationDatum[] = useMemo(
    () => [
      {
        dataValue: markerValue,
        details: i18n.translate('kbnApmUiShared.durationDistributionChart.percentileMarkerLabel', {
          defaultMessage: '{markerPercentile}th percentile',
          values: {
            markerPercentile,
          },
        }),
      },
    ],
    [markerPercentile, markerValue]
  );

  // This will create y axis ticks for 1, 10, 100, 1000 ...
  const { yTicks, yAxisMaxDomain, yAxisDomain, formattedData } = useMemo(() => {
    const yMax = Math.max(...data.flatMap((d) => d.histogram).map((d) => d.doc_count)) ?? 0;
    const computedYTicks = Math.max(1, Math.ceil(Math.log10(yMax)));
    const computedMaxDomain = Math.pow(10, computedYTicks);

    return {
      yTicks: computedYTicks,
      yAxisMaxDomain: computedMaxDomain,
      yAxisDomain: {
        min: Y_AXIS_MIN_DOMAIN,
        max: computedMaxDomain,
      },
      formattedData: isOtelData
        ? data.map((d) => ({
            ...d,
            histogram: d.histogram.map((hist) => ({ ...hist, key: hist.key * 0.001 })),
          }))
        : data,
    };
  }, [isOtelData, data]);

  const selectionAnnotation = useMemo(() => {
    return selection !== undefined
      ? [
          {
            coordinates: {
              x0: selection[0],
              x1: selection[1],
              y0: 0,
              y1: yAxisMaxDomain,
            },
            details: 'selection',
          },
        ]
      : undefined;
  }, [selection, yAxisMaxDomain]);

  const chartData = useMemo(
    () =>
      formattedData.map((d) => ({
        ...d,
        histogram: replaceHistogramZerosWithMinimumDomainValue(d.histogram),
      })),
    [formattedData]
  );

  return (
    <div
      data-test-subj={dataTestSubPrefix + 'CorrelationsChart'}
      style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
    >
      <ChartContainer height={250} hasData={hasData} loading={loading} hasError={hasError}>
        <Chart>
          <Settings
            rotation={0}
            theme={[
              {
                legend: {
                  spacingBuffer: 100,
                },
                areaSeriesStyle: {
                  line: {
                    visible: true,
                  },
                  point: {
                    visible: 'never',
                    radius: 0,
                  },
                },
                axes: {
                  tickLine: {
                    visible: true,
                    size: 5,
                    padding: 10,
                  },
                  tickLabel: {
                    fontSize: 10,
                    fill: euiTheme.colors.mediumShade,
                    padding: 0,
                  },
                },
              },
              ...chartThemes.theme,
            ]}
            baseTheme={chartThemes.baseTheme}
            showLegend={showLegend}
            legendPosition={Position.Bottom}
            onBrushEnd={onChartSelection}
            locale={i18n.getLocale()}
          />
          {selectionAnnotation !== undefined && (
            <RectAnnotation
              dataValues={selectionAnnotation}
              id="rect_annotation_1"
              style={{
                strokeWidth: 1,
                stroke: euiTheme.colors.lightShade,
                fill: euiTheme.colors.lightShade,
                opacity: 0.9,
              }}
              hideTooltips={true}
            />
          )}
          {typeof markerCurrentEvent === 'number' && (
            <LineAnnotation
              id="annotation_current_event"
              domainType={AnnotationDomainType.XDomain}
              dataValues={[
                {
                  dataValue: markerCurrentEvent,
                  details: i18n.translate(
                    'kbnApmUiShared.durationDistributionChart.currentEventMarkerLabel',
                    {
                      defaultMessage: 'Current sample',
                    }
                  ),
                },
              ]}
              style={getAnnotationsStyle(euiPaletteColorBlind()[0])}
              marker={i18n.translate(
                'kbnApmUiShared.durationDistributionChart.currentEventMarkerLabel',
                {
                  defaultMessage: 'Current sample',
                }
              )}
              markerPosition={'bottom'}
            />
          )}
          <LineAnnotation
            id="correlationsChartPercentileAnnotation"
            domainType={AnnotationDomainType.XDomain}
            dataValues={annotationsDataValues}
            style={getAnnotationsStyle()}
            marker={`${markerPercentile}p`}
            markerPosition={'top'}
          />
          <Axis
            id="x-axis"
            title={
              showAxisTitle
                ? i18n.translate('kbnApmUiShared.durationDistributionChart.latencyLabel', {
                    defaultMessage: 'Latency',
                  })
                : ''
            }
            position={Position.Bottom}
            tickFormat={xAxisTickFormat}
            gridLine={{ visible: false }}
          />
          <Axis
            id="y-axis"
            domain={yAxisDomain}
            title={
              showAxisTitle
                ? eventType === ProcessorEvent.transaction
                  ? NUMBER_OF_TRANSACTIONS_LABEL
                  : NUMBER_OF_SPANS_LABEL
                : ''
            }
            position={Position.Left}
            ticks={yTicks}
            gridLine={{ visible: true }}
          />
          {chartData.map((d) => (
            <AreaSeries
              key={d.id}
              id={d.id}
              xScaleType={ScaleType.Log}
              yScaleType={ScaleType.Log}
              data={d.histogram}
              curve={CurveType.CURVE_STEP_AFTER}
              xAccessor="key"
              yAccessors={['doc_count']}
              color={d.areaSeriesColor}
              fit="linear"
              areaSeriesStyle={{
                fit: {
                  line: { visible: true },
                },
              }}
              // To make the area appear with a continuous line,
              // we changed the original data to replace values of 0 with Y_AXIS_MIN_DOMAIN.
              // To show the correct values again in tooltips, we use a custom tickFormat to round values.
              // We can safely do this because all duration values above 0 are without decimal points anyway.
              tickFormat={(p) => `${Math.floor(p)}`}
            />
          ))}
        </Chart>
      </ChartContainer>
    </div>
  );
}
