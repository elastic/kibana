/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fit, ScaleContinuousType } from '@elastic/charts';

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
import { getSafeId } from '../utils/accessors';

export function getConfig(
  table: Datatable,
  params: VisParams,
  useLegacyTimeAxis = false,
  darkMode = false
): VisConfig {
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
  const tooltip = getTooltip(aspects, params);

  const yAxes: Array<AxisConfig<ScaleContinuousType>> = [];

  // avoid duplicates based on aggId
  const aspectVisited = new Set();
  params.dimensions.y.forEach((y) => {
    const accessor = y.accessor;
    const aspect = aspects.y.find(({ column }) => column === accessor);
    const aggId = getSafeId(aspect?.aggId);
    const serie = params.seriesParams.find(({ data: { id } }) => id === aggId);
    const valueAxis = params.valueAxes.find(({ id }) => id === serie?.valueAxis);
    if (aspect && valueAxis && !aspectVisited.has(aggId)) {
      yAxes.push(getAxis<YScaleType>(valueAxis, params.grid, aspect, params.seriesParams));
      aspectVisited.add(aggId);
    }
  });

  const rotation = getRotation(params.categoryAxes[0]);

  const isDateHistogram = params.dimensions.x?.aggType === BUCKET_TYPES.DATE_HISTOGRAM;
  const isHistogram = params.dimensions.x?.aggType === BUCKET_TYPES.HISTOGRAM;
  const enableHistogramMode =
    (isDateHistogram || isHistogram) &&
    shouldEnableHistogramMode(params.seriesParams, aspects.y, yAxes);

  const useMultiLayerTimeAxis =
    enableHistogramMode && isDateHistogram && !useLegacyTimeAxis && rotation === 0;

  const xAxis = getAxis<XScaleType>(
    params.categoryAxes[0],
    params.grid,
    aspects.x,
    params.seriesParams,
    isDateHistogram,
    useMultiLayerTimeAxis,
    darkMode
  );

  const isTimeChart = (aspects.x.params as DateHistogramParams).date ?? false;

  return {
    // NOTE: downscale ratio to match current vislib implementation
    markSizeRatio: radiusRatio * 0.6,
    fittingFunction: fittingFunction ?? Fit.Linear,
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
    rotation,
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
    return mode === 'stacked';
  });
};
