/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ScaleContinuousType } from '@elastic/charts';

import { Datatable } from '../../../../expressions/public';
import { BUCKET_TYPES } from '../../../../data/public';
import { DateHistogramParams } from '../../../../visualizations/public';

import {
  Aspect,
  AxisConfig,
  SeriesParam,
  VisConfig,
  VisParams,
  XScaleType,
  YScaleType,
} from '../types';
import { getThresholdLine } from './get_threshold_line';
import { getRotation } from './get_rotation';
import { getTooltip } from './get_tooltip';
import { getLegend } from './get_legend';
import { getAxis } from './get_axis';
import { getAspects } from './get_aspects';
import { ChartType } from '../index';

export function getConfig(table: Datatable, params: VisParams): VisConfig {
  const {
    thresholdLine,
    orderBucketsBySum,
    addTimeMarker,
    radiusRatio,
    labels,
    fittingFunction,
    detailedTooltip,
    isVislibVis,
    fillOpacity,
  } = params;
  const aspects = getAspects(table.columns, params.dimensions);
  const xAxis = getAxis<XScaleType>(
    params.categoryAxes[0],
    params.grid,
    aspects.x,
    params.seriesParams,
    params.dimensions.x?.aggType === BUCKET_TYPES.DATE_HISTOGRAM
  );
  const tooltip = getTooltip(aspects, params);
  const yAxes = params.valueAxes.map((a) =>
    // uses first y aspect in array for formatting axis
    getAxis<YScaleType>(a, params.grid, aspects.y[0], params.seriesParams)
  );
  const enableHistogramMode =
    (params.dimensions.x?.aggType === BUCKET_TYPES.DATE_HISTOGRAM ||
      params.dimensions.x?.aggType === BUCKET_TYPES.HISTOGRAM) &&
    shouldEnableHistogramMode(params.seriesParams, aspects.y, yAxes);
  const isTimeChart = (aspects.x.params as DateHistogramParams).date ?? false;

  return {
    // NOTE: downscale ratio to match current vislib implementation
    markSizeRatio: radiusRatio * 0.6,
    fittingFunction,
    fillOpacity,
    detailedTooltip,
    orderBucketsBySum,
    isTimeChart,
    isVislibVis,
    showCurrentTime: addTimeMarker && isTimeChart,
    showValueLabel: labels.show ?? false,
    enableHistogramMode,
    tooltip,
    aspects,
    xAxis,
    yAxes,
    legend: getLegend(params),
    rotation: getRotation(params.categoryAxes[0]),
    thresholdLine: getThresholdLine(thresholdLine, yAxes, params.seriesParams),
  };
}

/**
 * disables histogram mode for any config that has non-stacked clustered bars
 *
 * @param seriesParams
 * @param yAspects
 * @param yAxes
 */
const shouldEnableHistogramMode = (
  seriesParams: SeriesParam[],
  yAspects: Aspect[],
  yAxes: Array<AxisConfig<ScaleContinuousType>>
): boolean => {
  const bars = seriesParams.filter(({ type, data: { id: paramId } }) => {
    return (
      type === ChartType.Histogram && yAspects.find(({ aggId }) => aggId === paramId) !== undefined
    );
  });

  const groupIds = [
    ...bars.reduce<Set<string>>((acc, { valueAxis: groupId, mode }) => {
      acc.add(groupId);
      return acc;
    }, new Set()),
  ];

  if (groupIds.length > 1) {
    return false;
  }

  return bars.every(({ valueAxis: groupId, mode }) => {
    const yAxisScale = yAxes.find(({ groupId: axisGroupId }) => axisGroupId === groupId)?.scale;

    return mode === 'stacked' || yAxisScale?.mode === 'percentage';
  });
};
