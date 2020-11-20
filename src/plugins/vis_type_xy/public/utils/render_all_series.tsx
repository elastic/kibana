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
  AccessorFn,
} from '@elastic/charts';
import { Accessor } from '@elastic/charts/dist/utils/accessor';
import { ColorVariant } from '@elastic/charts/dist/utils/commons';

import { DatatableRow } from '../../../expressions/public';
import { BUCKET_TYPES } from '../../../data/public';

import { ChartType } from '../../common';
import { SeriesParam, VisConfig, FakeParams, Aspect } from '../types';

/**
 * Matches vislib curve to elastic charts
 * @param type curve type
 */
const getCurveType = (type?: 'linear' | 'cardinal' | 'step-after'): CurveType => {
  switch (type) {
    case 'cardinal':
      return CurveType.CURVE_MONOTONE_X;
    case 'step-after':
      return CurveType.CURVE_STEP_AFTER;
    case 'linear':
    default:
      return CurveType.LINEAR;
  }
};

const getXAccessor = (xAspect: Aspect): Accessor | AccessorFn => {
  if (!xAspect.accessor) {
    return () => (xAspect.params as FakeParams)?.defaultValue;
  }

  if (
    !(
      (xAspect.aggType === BUCKET_TYPES.DATE_RANGE || xAspect.aggType === BUCKET_TYPES.RANGE) &&
      xAspect.formatter
    )
  ) {
    return xAspect.accessor;
  }

  const formatter = xAspect.formatter;
  const accessor = xAspect.accessor;
  return (d) => {
    const v = d[accessor];
    if (!v) {
      return;
    }
    const f = formatter(v);
    return f;
  };
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
  data: DatatableRow[],
  getSeriesName: (series: XYChartSeriesIdentifier) => SeriesName,
  getSeriesColor: SeriesColorAccessorFn,
  timeZone: string,
  hasNonStackedBars: boolean
) => {
  const xAccessor = getXAccessor(aspects.x);

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
      const isStacked = mode === 'stacked' || yAxisScale?.mode === 'percentage';
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
              splitSeriesAccessors={splitSeriesAccessors}
              data={data}
              timeZone={timeZone}
              stackAccessors={isStacked ? ['__any_value__'] : undefined}
              enableHistogramMode={!isStacked && hasNonStackedBars ? false : enableHistogramMode}
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
          const markSizeAccessor = showCircles ? aspects.z?.accessor ?? undefined : undefined;

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
              markSizeAccessor={markSizeAccessor}
              markFormat={aspects.z?.formatter}
              splitSeriesAccessors={splitSeriesAccessors}
              data={data}
              stackAccessors={isStacked ? ['__any_value__'] : undefined}
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
                  fill: markSizeAccessor ? ColorVariant.Series : undefined,
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
