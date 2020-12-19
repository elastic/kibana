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

import { ScaleContinuousType } from '@elastic/charts/dist/scales';

import { Datatable } from '../../../expressions/public';
import { BUCKET_TYPES } from '../../../data/public';

import {
  Aspect,
  AxisConfig,
  DateHistogramParams,
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

  if (bars.length === 1) {
    return true;
  }

  const groupIds = [
    ...bars.reduce<Set<string>>((acc, { valueAxis: groupId, mode }) => {
      acc.add(groupId);
      return acc;
    }, new Set()),
  ];

  if (groupIds.length > 1) {
    return false;
  }

  const test = bars.every(({ valueAxis: groupId, mode }) => {
    const yAxisScale = yAxes.find(({ groupId: axisGroupId }) => axisGroupId === groupId)?.scale;

    return mode === 'stacked' || yAxisScale?.mode === 'percentage';
  });

  return test;
};
