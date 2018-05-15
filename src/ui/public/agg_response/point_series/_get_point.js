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

import _ from 'lodash';
import AggConfigResult from '../../vis/agg_config_result';

export function PointSeriesGetPointProvider() {

  return function getPoint(x, series, yScale, row, y, z) {
    const zRow = z && row[z.id];
    const xRow = row[x.id];

    // todo: wrap in aggConfigResult
    const point = {
      x: xRow ? xRow : '_all',
      y: row[y.id],
      z: zRow,
      aggConfigResult: new AggConfigResult(y.aggConfig, null, row[y.id]),
      extraMetrics: _.compact([zRow]),
      yScale: yScale
    };

    if (point.y === 'NaN') {
      // filter out NaN from stats
      // from metrics that are not based at zero
      return;
    }

    if (series) {
      const seriesArray = series.length ? series : [ series ];
      point.aggConfig = seriesArray[0].aggConfig;
      point.series = seriesArray.map(s => s.aggConfig.fieldFormatter()(row[s.id])).join(' - ');
    } else if (y) {
      // If the data is not split up with a series aspect, then
      // each point's "series" becomes the y-agg that produced it
      point.aggConfig = y.aggConfig;
      point.series = y.title;
    }

    if (yScale) {
      point.y *= yScale;
    }

    return point;
  };
}
