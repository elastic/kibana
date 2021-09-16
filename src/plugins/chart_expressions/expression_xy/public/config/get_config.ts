/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ScaleContinuousType } from '@elastic/charts';

import { Datatable } from '../../../../expressions/public';
import { KBN_FIELD_TYPES } from '../../../../data/public';
import {
  AxisConfig,
  AxisMode,
  ChartMode,
  SeriesParam,
  VisConfig,
  VisTypeXyConfig,
  XScaleType,
  YScaleType,
  ChartType,
} from '../../common/types';
import { getThresholdLine } from './get_threshold_line';
import { getRotation } from './get_rotation';
import { getTooltip } from './get_tooltip';
import { getLegend } from './get_legend';
import { getAxis } from './get_axis';
import { getAspects } from './get_aspects';

export function getConfig(table: Datatable, params: VisTypeXyConfig): VisConfig {
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
  const yAxes = params.valueAxes.map((a) =>
    // shouldApplyFormatter = true, because no formatter was applied to this axis values before
    // and will be not applied in the future
    getAxis<YScaleType>(a, params.grid, aspects.y[0], params.seriesParams, false, true)
  );

  const enableHistogramMode =
    (params.enableHistogramMode ?? false) && shouldEnableHistogramMode(params.seriesParams, yAxes);

  const timeChartFieldTypes: string[] = [KBN_FIELD_TYPES.DATE, KBN_FIELD_TYPES.DATE_RANGE];
  const isTimeChart = timeChartFieldTypes.includes(aspects.x.format?.id ?? '');

  const xAxis = getAxis<XScaleType>(
    params.categoryAxes[0],
    params.grid,
    aspects.x,
    params.seriesParams,
    aspects.x.format?.id === KBN_FIELD_TYPES.DATE
  );

  const tooltip = getTooltip(aspects, params);

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
    xDomain: params.xDomain,
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
  yAxes: Array<AxisConfig<ScaleContinuousType>>
): boolean => {
  const bars = seriesParams.filter(({ type, show }) => show && type === ChartType.Histogram);
  const groupsCount = bars.reduce<Record<string, number>>((acc, { valueAxis: groupId }) => {
    acc[groupId] = (acc[groupId] ?? 0) + 1;
    return acc;
  }, {});

  const groupIds = Object.keys(groupsCount);

  const singleBarGroupIds = groupIds.filter((groupId) => groupsCount[groupId] === 1);
  const stackedGroupIds = groupIds.filter((groupId) => groupsCount[groupId] > 1);

  if (!stackedGroupIds.length && singleBarGroupIds.length === 1) {
    return true;
  }

  if (groupIds.length > 1) {
    return false;
  }

  return bars.every(({ valueAxis: groupId, mode }) => {
    const yAxisScale = yAxes.find(({ groupId: axisGroupId }) => axisGroupId === groupId)?.scale;
    return mode === ChartMode.Stacked || yAxisScale?.mode === AxisMode.Percentage;
  });
};
