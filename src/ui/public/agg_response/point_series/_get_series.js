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

export function getSeries(table, chart) {
  const aspects = chart.aspects;
  const multiY = Array.isArray(aspects.y) && aspects.y.length > 1;
  const yScale = chart.yScale;
  const partGetPoint = _.partial(getPoint, table, aspects.x[0], aspects.series, yScale);

  let series = _(table.rows)
    .transform(function (series, row, rowIndex) {
      if (!multiY) {
        const point = partGetPoint(row, rowIndex, aspects.y[0], aspects.z);
        const id = `${point.series}-${aspects.y[0].accessor}`;
        if (point) addToSiri(series, point, id, point.series, aspects.y[0].format);
        return;
      }

      aspects.y.forEach(function (y) {
        const point = partGetPoint(row, rowIndex, y, aspects.z);
        if (!point) return;

        // use the point's y-axis as it's series by default,
        // but augment that with series aspect if it's actually
        // available
        let seriesId = y.accessor;
        let seriesLabel = y.title;

        if (aspects.series) {
          const prefix = point.series ? point.series + ': ' : '';
          seriesId = prefix + seriesId;
          seriesLabel = prefix + seriesLabel;
        }

        addToSiri(series, point, seriesId, seriesLabel, y.format);
      });

    }, new Map())
    .thru(series => [...series.values()])
    .value();

  if (multiY) {
    series = _.sortBy(series, function (siri) {
      const firstVal = siri.values[0];
      let y;

      if (firstVal) {
        y = _.find(aspects.y, function (y) {
          return y.accessor === firstVal.accessor;
        });
      }

      return y ? y.i : series.length;
    });
  }

  return series;
}
