/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  AreaSeries,
  CurveType,
  BarSeries,
  XYChartSeriesIdentifier,
  SeriesColorAccessorFn,
  SeriesName,
  Accessor,
  AccessorFn,
  ColorVariant,
} from '@elastic/charts';

import { DatatableRow } from '../../../expressions/public';

import { ChartType } from '../../common';
import { SeriesParam, VisConfig } from '../types';

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
  xAccessor: Accessor | AccessorFn,
  splitSeriesAccessors: Array<Accessor | AccessorFn>
) =>
  seriesParams.map(
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
      const yAspects = aspects.y.filter(
        ({ aggId, accessor }) => aggId?.includes(paramId) && accessor !== null
      );
      if (!show || !yAspects.length) {
        return null;
      }
      const yAccessors = yAspects.map((aspect) => aspect.accessor) as string[];

      const id = `${type}-${yAccessors[0]}`;
      const yAxisScale = yAxes.find(({ groupId: axisGroupId }) => axisGroupId === groupId)?.scale;
      const isStacked = mode === 'stacked' || yAxisScale?.mode === 'percentage';
      const stackMode = yAxisScale?.mode === 'normal' ? undefined : yAxisScale?.mode;
      // needed to seperate stacked and non-stacked bars into unique pseudo groups
      const pseudoGroupId = isStacked ? `__pseudo_stacked_group-${groupId}__` : groupId;
      // set domain of stacked groups to use actual groupId not pseudo groupdId
      const useDefaultGroupDomain = isStacked ? groupId : undefined;

      switch (type) {
        case ChartType.Histogram:
          return (
            <BarSeries
              key={id}
              id={id}
              name={getSeriesName}
              color={getSeriesColor}
              tickFormat={yAspects[0].formatter}
              groupId={pseudoGroupId}
              useDefaultGroupDomain={useDefaultGroupDomain}
              xScaleType={xAxis.scale.type}
              yScaleType={yAxisScale?.type}
              xAccessor={xAccessor}
              yAccessors={yAccessors}
              splitSeriesAccessors={splitSeriesAccessors}
              data={data}
              timeZone={timeZone}
              stackAccessors={isStacked ? ['__any_value__'] : undefined}
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
          const markSizeAccessor = showCircles ? aspects.z?.accessor ?? undefined : undefined;

          return (
            <AreaSeries
              key={id}
              id={id}
              fit={fittingFunction}
              color={getSeriesColor}
              tickFormat={yAspects[0].formatter}
              name={getSeriesName}
              curve={getCurveType(interpolate)}
              groupId={pseudoGroupId}
              useDefaultGroupDomain={useDefaultGroupDomain}
              xScaleType={xAxis.scale.type}
              yScaleType={yAxisScale?.type}
              xAccessor={xAccessor}
              yAccessors={yAccessors}
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
