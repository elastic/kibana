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

import { Datatable } from '../../../expressions/public';

import { DateHistogramParams, VisConfig, VisParams, XScaleType, YScaleType } from '../types';
import { getThresholdLine } from './get_threshold_line';
import { getRotation } from './get_rotation';
import { getTooltip } from './get_tooltip';
import { getLegend } from './get_legend';
import { getAxis } from './get_axis';
import { getAspects } from './get_aspects';

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
  const enableHistogramMode = ['date_histogram', 'histogram'].includes(
    params.dimensions.x?.aggType ?? ''
  );
  const aspects = getAspects(table.columns, params.dimensions);
  const xAxis = getAxis<XScaleType>(
    params.categoryAxes[0],
    params.grid,
    aspects.x,
    params.dimensions.x?.aggType === 'date_histogram'
  );
  const tooltip = getTooltip(aspects, params, xAxis.ticks?.formatter);
  const fallbackGroupId = params.seriesParams.find(({ valueAxis }) =>
    params.valueAxes.some(({ id }) => valueAxis === id)
  )?.valueAxis;
  // TODO get formatter for each value axis
  const yAxes = params.valueAxes
    .map((a) => getAxis<YScaleType>(a, params.grid, aspects.y[0]))
    .map(({ groupId, ...rest }) => ({
      ...rest,
      // TODO remove when allowed to display unassigned axes
      groupId: params.seriesParams.some(({ valueAxis }) => valueAxis === groupId)
        ? groupId
        : fallbackGroupId,
    }));
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
