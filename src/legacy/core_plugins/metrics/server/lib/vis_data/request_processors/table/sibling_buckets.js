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
import getBucketSize from '../../helpers/get_bucket_size';
import bucketTransform from '../../helpers/bucket_transform';
import getIntervalAndTimefield from '../../get_interval_and_timefield';
import { calculateAggRoot } from './calculate_agg_root';
export default function siblingBuckets(req, panel, esQueryConfig, indexPatternObject) {
  return next => doc => {
    const { interval } = getIntervalAndTimefield(panel, {}, indexPatternObject);
    const { bucketSize } = getBucketSize(req, interval);
    panel.series.forEach(column => {
      const aggRoot = calculateAggRoot(doc, column);
      column.metrics
        .filter(row => /_bucket$/.test(row.type))
        .forEach(metric => {
          const fn = bucketTransform[metric.type];
          if (fn) {
            try {
              const bucket = fn(metric, column.metrics, bucketSize);
              _.set(doc, `${aggRoot}.${metric.id}`, bucket);
            } catch (e) {
              // meh
            }
          }
        });
    });
    return next(doc);
  };
}
