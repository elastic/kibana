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

import { get } from 'lodash';
import moment from 'moment';
export function dropLastBucket(resp, panel, series) {
  return next => results => {
    if (panel.timerange_mode === 'all') return next(results);
    const bucketSize = get(resp, `aggregations.${series.id}.meta.bucketSize`);
    const maxString = get(resp, `aggregations.${series.id}.meta.to`);
    const max = moment.utc(maxString);
    const seriesDropLastBucket = get(series, 'override_drop_last_bucket', 1);
    const dropLastBucket = get(panel, 'drop_last_bucket', seriesDropLastBucket);

    const isCompatibleRequest = panel.timerange_mode !== 'all' || panel.type === 'timeseries';
    if (dropLastBucket && isCompatibleRequest) {
      results.forEach(item => {
        const lastIndex = item.data.reduceRight((acc, row) => {
          const date = moment.utc(row[0] + bucketSize);
          return date.isAfter(max) ? --acc : acc;
        }, item.data.length);
        item.data = item.data.slice(0, lastIndex);
      });
    }

    return next(results);
  };
}

