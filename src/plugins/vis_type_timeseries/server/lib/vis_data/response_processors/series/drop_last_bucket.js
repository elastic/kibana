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
import { isLastValueTimerangeMode } from '../../helpers/get_timerange_mode';

export function dropLastBucket(resp, panel, series) {
  return next => results => {
    const shouldDropLastBucket = isLastValueTimerangeMode(panel, series);

    if (shouldDropLastBucket) {
      const seriesDropLastBucket = get(series, 'override_drop_last_bucket', 1);
      const dropLastBucket = get(panel, 'drop_last_bucket', seriesDropLastBucket);

      if (dropLastBucket) {
        results.forEach(item => {
          item.data = item.data.slice(0, item.data.length - 1);
        });
      }
    }

    return next(results);
  };
}
