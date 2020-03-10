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
import { QueryStart, SavedQuery, compareFilters, COMPARE_ALL_OPTIONS } from '../../../query';
import { Filter } from '../../../../common';

export const populateStateFromSavedQuery = (
  queryService: QueryStart,
  setQueryStringState: Function,
  prevQuery: SavedQuery | undefined,
  savedQuery: SavedQuery
) => {
  const {
    timefilter: { timefilter },
    filterManager,
  } = queryService;
  // timefilter
  if (savedQuery.attributes.timefilter) {
    timefilter.setTime({
      from: savedQuery.attributes.timefilter.from,
      to: savedQuery.attributes.timefilter.to,
    });
    if (savedQuery.attributes.timefilter.refreshInterval) {
      timefilter.setRefreshInterval(savedQuery.attributes.timefilter.refreshInterval);
    }
  }

  // query string
  setQueryStringState(savedQuery.attributes.query);

  // filters
  const prevSavedQueryFilters = prevQuery?.attributes.filters || [];
  const savedQueryFilters = savedQuery.attributes.filters || [];
  const curFilters = filterManager.getFilters();

  // Remove filters added by the previous saved query
  const filtersToKeep = curFilters.filter((fmFilter: Filter) => {
    return !_.find(prevSavedQueryFilters, (prevSavedQueryFilter: Filter) => {
      return compareFilters(fmFilter, prevSavedQueryFilter, COMPARE_ALL_OPTIONS);
    });
  });

  filterManager.setFilters([...filtersToKeep, ...savedQueryFilters]);
};
