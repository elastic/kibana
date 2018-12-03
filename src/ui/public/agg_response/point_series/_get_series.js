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
import { getPoint } from './_get_point';
import { addToSiri } from './_add_to_siri';

export function getSeries(rows, chart) {
  const aspects = chart.aspects;
  const multiY = Array.isArray(aspects.y);
  const yScale = chart.yScale;
  const partGetPoint = _.partial(getPoint, aspects.x, aspects.series, yScale);

  let series = _(rows)
    .transform(function (series, row) {
      if (!multiY) {
        const point = partGetPoint(row, aspects.y, aspects.z);
        if (point) addToSiri(series, point, point.series, point.series, aspects.y.aggConfig);
        return;
      }

      aspects.y.forEach(function (y) {
        const point = partGetPoint(row, y, aspects.z);
        if (!point) return;

        // use the point's y-axis as it's series by default,
        // but augment that with series aspect if it's actually
        // available
        let seriesId = y.aggConfig.id;
        let seriesLabel = y.title;

        if (aspects.series) {
          const prefix = point.series ? point.series + ': ' : '';
          seriesId = prefix + seriesId;
          seriesLabel = prefix + seriesLabel;
        }

        addToSiri(series, point, seriesId, seriesLabel, y.aggConfig);
      });

    }, new Map())
    .thru(series => [...series.values()])
    .value();

  if (multiY) {
    series = _.sortBy(series, function (siri) {
      const firstVal = siri.values[0];
      let y;

      if (firstVal) {
        const agg = firstVal.aggConfigResult.aggConfig;
        y = _.find(aspects.y, function (y) {
          return y.aggConfig === agg;
        });
      }

      return y ? y.i : series.length;
    });
  }

  return series;
}
