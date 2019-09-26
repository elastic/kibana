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

import { CidrMask } from '../../../utils/cidr_mask';
import { buildRangeFilter } from '@kbn/es-query';

export function createFilterIpRange(aggConfig, key) {
  let range;
  if (aggConfig.params.ipRangeType === 'mask') {
    range = new CidrMask(key).getRange();
  } else {
    const [from, to] = key.split(/\s+to\s+/);
    range = {
      from: from === '-Infinity' ? -Infinity : from,
      to: to === 'Infinity' ? Infinity : to
    };
  }

  return buildRangeFilter(aggConfig.params.field, { gte: range.from, lte: range.to }, aggConfig.getIndexPattern());
}
