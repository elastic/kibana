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

import { RangeFilter } from '../range_filter';
import { FilterViews } from './index';

export function getRangeFilterViews(filter: RangeFilter): FilterViews {
  return {
    getDisplayText() {
      const { meta } = filter;
      const { key, params } = meta;
      const { gt, gte, lt, lte } = params;
      return `${key}: ${getFrom(gt, gte)} to ${getTo(lt, lte)}`;
    },
  };
}

function getFrom(gt: string | number | undefined, gte: string | number | undefined): string {
  if (typeof gt !== 'undefined' && gt !== null) {
    return `${gt}`;
  } else if (typeof gte !== 'undefined' && gte !== null) {
    return `${gte}`;
  }
  return '-∞';
}

function getTo(lt: string | number | undefined, lte: string | number | undefined): string {
  if (typeof lt !== 'undefined' && lt !== null) {
    return `${lt}`;
  } else if (typeof lte !== 'undefined' && lte !== null) {
    return `${lte}`;
  }
  return '∞';
}
