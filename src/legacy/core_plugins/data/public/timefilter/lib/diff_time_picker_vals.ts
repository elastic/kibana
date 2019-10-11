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

import { RefreshInterval } from 'src/plugins/data/public';
import { InputTimeRange } from '../types';

const valueOf = function(o: any) {
  if (o) return o.valueOf();
};

export function areRefreshIntervalsDifferent(rangeA: RefreshInterval, rangeB: RefreshInterval) {
  if (_.isObject(rangeA) && _.isObject(rangeB)) {
    if (
      valueOf(rangeA.value) !== valueOf(rangeB.value) ||
      valueOf(rangeA.pause) !== valueOf(rangeB.pause)
    ) {
      return true;
    }
  } else {
    return !_.isEqual(rangeA, rangeB);
  }

  return false;
}

export function areTimeRangesDifferent(rangeA: InputTimeRange, rangeB: InputTimeRange) {
  if (rangeA && rangeB && _.isObject(rangeA) && _.isObject(rangeB)) {
    if (
      valueOf(rangeA.to) !== valueOf(rangeB.to) ||
      valueOf(rangeA.from) !== valueOf(rangeB.from)
    ) {
      return true;
    }
  } else {
    return !_.isEqual(rangeA, rangeB);
  }

  return false;
}
