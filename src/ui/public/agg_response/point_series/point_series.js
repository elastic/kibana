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

import { PointSeriesGetSeriesProvider } from './_get_series';
import { PointSeriesGetAspectsProvider } from './_get_aspects';
import { PointSeriesInitYAxisProvider } from './_init_y_axis';
import { PointSeriesInitXAxisProvider } from './_init_x_axis';
import { PointSeriesOrderedDateAxisProvider } from './_ordered_date_axis';
import { PointSeriesTooltipFormatter } from './_tooltip_formatter';

export function AggResponsePointSeriesProvider(Private) {

  const getSeries = Private(PointSeriesGetSeriesProvider);
  const getAspects = Private(PointSeriesGetAspectsProvider);
  const initYAxis = Private(PointSeriesInitYAxisProvider);
  const initXAxis = Private(PointSeriesInitXAxisProvider);
  const setupOrderedDateXAxis = Private(PointSeriesOrderedDateAxisProvider);
  const tooltipFormatter = Private(PointSeriesTooltipFormatter);

  return function pointSeriesChartDataFromTable(vis, table) {
    const chart = {};
    const aspects = chart.aspects = getAspects(vis, table);

    chart.tooltipFormatter = tooltipFormatter;

    initXAxis(chart);
    initYAxis(chart);

    const datedX = aspects.x.aggConfig.type.ordered && aspects.x.aggConfig.type.ordered.date;
    if (datedX) {
      setupOrderedDateXAxis(vis, chart);
    }

    chart.series = getSeries(table.rows, chart);

    delete chart.aspects;
    return chart;
  };
}
