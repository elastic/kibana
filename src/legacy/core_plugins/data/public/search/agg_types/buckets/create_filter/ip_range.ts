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

import { CidrMask } from '../lib/cidr_mask';
import { IBucketAggConfig } from '../_bucket_agg_type';
import { IpRangeKey } from '../ip_range';
import { esFilters } from '../../../../../../../../plugins/data/public';

export const createFilterIpRange = (aggConfig: IBucketAggConfig, key: IpRangeKey) => {
  let range: esFilters.RangeFilterParams;

  if (key.type === 'mask') {
    range = new CidrMask(key.mask).getRange();
  } else {
    range = {
      from: key.from ? key.from : -Infinity,
      to: key.to ? key.to : Infinity,
    };
  }

  return esFilters.buildRangeFilter(
    aggConfig.params.field,
    { gte: range.from, lte: range.to },
    aggConfig.getIndexPattern()
  );
};
