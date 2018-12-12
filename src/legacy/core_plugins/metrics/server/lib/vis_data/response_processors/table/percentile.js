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
import getAggValue from '../../helpers/get_agg_value';
import getSplits from '../../helpers/get_splits';
import getLastMetric from '../../helpers/get_last_metric';
export default function percentile(resp, panel, series) {
  return next => results => {
    const metric = getLastMetric(series);
    if (metric.type !== 'percentile') return next(results);

    getSplits(resp, panel, series).forEach((split) => {
      const label = (split.label) + ` (${series.value})`;
      const data = split.timeseries.buckets.map(bucket => {
        const m = _.assign({}, metric, { percent: series.value });
        return [bucket.key, getAggValue(bucket, m)];
      });
      results.push({
        id: `${percentile.id}:${split.id}`,
        label,
        data,
      });

    });
    return next(results);
  };
}
