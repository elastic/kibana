/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { compact } from 'lodash';

import {
  AreaSeries,
  CurveType,
  BarSeries,
  XYChartSeriesIdentifier,
  SeriesColorAccessorFn,
  SeriesName,
} from '@elastic/charts';

import { KibanaDatatableRow } from '../../../expressions/public';
import { ChartType } from '../../common/types';
import { SeriesParam, VisConfig, FakeParams } from '../types';

/**
 * Matches vislib curve to elastic charts
 * @param type curve type
 */
const getCurveType = (type?: 'linear' | 'cardinal' | 'step-after'): CurveType => {
  switch (type) {
    case 'cardinal':
      return CurveType.CURVE_NATURAL;
    case 'step-after':
      return CurveType.CURVE_STEP_AFTER;
    case 'linear':
    default:
      return CurveType.LINEAR;
  }
};

/**
 * Renders chart Line, Area or Bar series
 * @param config
 * @param seriesParams
 * @param data
 * @param getSeriesName
 * @param getSeriesColor
 */
export const renderAllSeries = (
  { aspects, yAxes, xAxis, showValueLabel, enableHistogramMode, fittingFunction }: VisConfig,
  seriesParams: SeriesParam[],
  data: KibanaDatatableRow[],
  getSeriesName: (series: XYChartSeriesIdentifier) => SeriesName,
  getSeriesColor: SeriesColorAccessorFn,
  timeZone: string
) => {
  const xAccessor = aspects.x.accessor ?? (() => (aspects.x.params as FakeParams)?.defaultValue);

  return seriesParams.map(
    ({
      show,
      valueAxis: groupId,
      data: { id: paramId },
      lineWidth: strokeWidth,
      showCircles,
      drawLinesBetweenPoints,
      mode,
      interpolate,
      type,
    }) => {
      const yAspect = aspects.y.find(({ aggId }) => aggId === paramId);

      if (!show || !yAspect || yAspect.accessor === null) {
        return null;
      }

      const id = `${type}-${yAspect.accessor}`;

      const splitSeriesAccessors = aspects.series
        ? (compact(aspects.series.map(({ accessor }) => accessor)) as string[])
        : [];
      const yAxisScale = yAxes.find(({ groupId: axisGroupId }) => axisGroupId === groupId)?.scale;
      const stackAccessors =
        mode === 'stacked' || yAxisScale?.mode === 'percentage'
          ? [typeof xAccessor === 'string' ? xAccessor : xAccessor()]
          : undefined;
      const stackMode = yAxisScale?.mode === 'normal' ? undefined : yAxisScale?.mode;

      switch (type) {
        case ChartType.Histogram:
          return (
            <BarSeries
              key={id}
              id={id}
              name={getSeriesName}
              color={getSeriesColor}
              tickFormat={yAspect.formatter}
              groupId={groupId}
              xScaleType={xAxis.scale.type}
              yScaleType={yAxisScale?.type}
              xAccessor={xAccessor}
              yAccessors={[yAspect.accessor]}
              markSizeAccessor={aspects.z?.accessor ?? undefined}
              splitSeriesAccessors={splitSeriesAccessors}
              data={data}
              timeZone={timeZone}
              stackAccessors={stackAccessors}
              enableHistogramMode={enableHistogramMode}
              stackMode={stackMode}
              minBarHeight={2}
              displayValueSettings={{
                showValueLabel,
                hideClippedValue: true,
              }}
            />
          );

        case ChartType.Area:
        case ChartType.Line:
          return (
            <AreaSeries
              key={id}
              id={id}
              fit={fittingFunction}
              color={getSeriesColor}
              tickFormat={yAspect.formatter}
              name={getSeriesName}
              curve={getCurveType(interpolate)}
              groupId={groupId}
              xScaleType={xAxis.scale.type}
              yScaleType={yAxisScale?.type}
              xAccessor={xAccessor}
              yAccessors={[yAspect.accessor]}
              markSizeAccessor={showCircles ? aspects.z?.accessor ?? undefined : undefined}
              markFormat={aspects.z?.formatter}
              splitSeriesAccessors={splitSeriesAccessors}
              data={data}
              stackAccessors={stackAccessors}
              displayValueSettings={{
                showValueLabel,
                hideClippedValue: true,
              }}
              timeZone={timeZone}
              stackMode={stackMode}
              areaSeriesStyle={{
                area: {
                  ...(type === ChartType.Line && { opacity: 0 }),
                },
                line: {
                  strokeWidth,
                  visible: drawLinesBetweenPoints,
                },
                point: {
                  visible: showCircles,
                },
              }}
            />
          );
        default:
          // Error: unsupported chart type
          return null;
      }
    }
  );
};
