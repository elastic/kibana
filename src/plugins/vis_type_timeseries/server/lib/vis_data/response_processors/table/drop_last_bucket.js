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

import { dropLastBucket } from '../series/drop_last_bucket';
import { isLastValueTimerangeMode } from '../../helpers/get_timerange_mode';

export function dropLastBucketFn(bucket, panel, series) {
  return (next) => (results) => {
    const shouldDropLastBucket = isLastValueTimerangeMode(panel);

    if (shouldDropLastBucket) {
      const fn = dropLastBucket({ aggregations: bucket }, panel, series);

      return fn(next)(results);
    }

    return next(results);
  };
}
