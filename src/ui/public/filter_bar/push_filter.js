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

export function FilterBarPushFilterProvider() {
  return function ($state) {
    if (!_.isObject($state)) throw new Error('pushFilters requires a state object');
    return function (filter, negate, index) {
      // Hierarchical and tabular data set their aggConfigResult parameter
      // differently because of how the point is rewritten between the two. So
      // we need to check if the point.orig is set, if not use try the point.aggConfigResult
      const pendingFilter = { meta: { negate: negate, index: index } };
      _.extend(pendingFilter, filter);
      $state.$newFilters = [pendingFilter];
    };
  };
}
