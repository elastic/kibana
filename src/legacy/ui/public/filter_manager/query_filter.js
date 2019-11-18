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

import { FilterStateManager } from 'plugins/data';
import { npStart } from 'ui/new_platform';

export function FilterBarQueryFilterProvider(getAppState, globalState) {
  const { filterManager } = npStart.plugins.data.query;
  const filterStateManager = new FilterStateManager(globalState, getAppState, filterManager);

  const queryFilter = {};
  queryFilter.getUpdates$ = filterManager.getUpdates$.bind(filterManager);
  queryFilter.getFetches$ = filterManager.getFetches$.bind(filterManager);
  queryFilter.getFilters = filterManager.getFilters.bind(filterManager);
  queryFilter.getAppFilters = filterManager.getAppFilters.bind(filterManager);
  queryFilter.getGlobalFilters = filterManager.getGlobalFilters.bind(filterManager);
  queryFilter.removeFilter = filterManager.removeFilter.bind(filterManager);
  queryFilter.addFilters = filterManager.addFilters.bind(filterManager);
  queryFilter.setFilters = filterManager.setFilters.bind(filterManager);
  queryFilter.removeAll = filterManager.removeAll.bind(filterManager);

  queryFilter.destroy = () => {
    filterManager.destroy();
    filterStateManager.destroy();
  };

  return queryFilter;
}
