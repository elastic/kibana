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
import { IBucketAggConfig } from '../_bucket_agg_type';
import { esFilters } from '../../../../../../plugins/data/public';

export const createFilterFilters = (aggConfig: IBucketAggConfig, key: string) => {
  // have the aggConfig write agg dsl params
  const dslFilters: any = get(aggConfig.toDsl(), 'filters.filters');
  const filter = dslFilters[key];
  const indexPattern = aggConfig.getIndexPattern();

  if (filter && indexPattern && indexPattern.id) {
    return esFilters.buildQueryFilter(filter.query, indexPattern.id, key);
  }
};
