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
import { getSplits } from '../../helpers/get_splits';
import { getLastMetric } from '../../helpers/get_last_metric';
import { getSiblingAggValue } from '../../helpers/get_sibling_agg_value';

export function stdDeviationSibling(resp, panel, series, meta) {
  return next => results => {
    const metric = getLastMetric(series);
    if (metric.mode === 'band' && metric.type === 'std_deviation_bucket') {
      getSplits(resp, panel, series, meta).forEach(split => {
        const mapBucketByMode = mode => {
          return bucket => {
            return [bucket.key, getSiblingAggValue(split, _.assign({}, metric, { mode }))];
          };
        };

        const upperData = split.timeseries.buckets.map(mapBucketByMode('upper'));
        const lowerData = split.timeseries.buckets.map(mapBucketByMode('lower'));

        results.push({
          id: `${split.id}:lower`,
          lines: { show: true, fill: false, lineWidth: 0 },
          points: { show: false },
          color: split.color,
          data: lowerData,
        });
        results.push({
          id: `${split.id}:upper`,
          label: split.label,
          color: split.color,
          lines: { show: true, fill: 0.5, lineWidth: 0 },
          points: { show: false },
          fillBetween: `${split.id}:lower`,
          data: upperData,
        });
      });
    }

    return next(results);
  };
}
