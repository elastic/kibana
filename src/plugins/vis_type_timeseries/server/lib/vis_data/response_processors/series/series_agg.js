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

import { SeriesAgg } from './_series_agg';
import _ from 'lodash';
import { getDefaultDecoration } from '../../helpers/get_default_decoration';
import { calculateLabel } from '../../../../../common/calculate_label';

export function seriesAgg(resp, panel, series) {
  return next => results => {
    if (series.metrics.some(m => m.type === 'series_agg')) {
      const decoration = getDefaultDecoration(series);

      const targetSeries = [];
      // Filter out the seires with the matching metric and store them
      // in targetSeries
      results = results.filter(s => {
        if (s.id.split(/:/)[0] === series.id) {
          targetSeries.push(s.data);
          return false;
        }
        return true;
      });
      const data = series.metrics
        .filter(m => m.type === 'series_agg')
        .reduce((acc, m) => {
          const fn = SeriesAgg[m.function];
          return (fn && fn(acc)) || acc;
        }, targetSeries);
      results.push({
        id: `${series.id}`,
        label: series.label || calculateLabel(_.last(series.metrics), series.metrics),
        color: series.color,
        data: _.first(data),
        ...decoration,
      });
    }
    return next(results);
  };
}
