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

import React from 'react';
import { Filter } from '@kbn/es-query';
import { CoreStart } from 'src/core/public';
import { Storage } from 'ui/storage';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';
import { TimefilterSetup } from '../../../timefilter';
import { FilterManager, SearchBar } from '../../../';
import { SearchBarOwnProps } from '.';

interface StatefulSearchBarDeps {
  core: CoreStart;
  storage: Storage;
  timefilter: TimefilterSetup;
  filterManager: FilterManager;
}

const defaultFiltersUpdated = (filterManager: FilterManager) => {
  return (filters: Filter[]) => {
    filterManager.setFilters(filters);
  };
};

const defaultOnRefreshChange = (timefilter: TimefilterSetup) => {
  return (options: { isPaused: boolean; refreshInterval: number }) => {
    timefilter.timefilter.setRefreshInterval({
      value: options.refreshInterval,
      pause: options.isPaused,
    });
  };
};

export function createSearchBar({
  core,
  storage,
  timefilter,
  filterManager,
}: StatefulSearchBarDeps) {
  const timeRange = timefilter.timefilter.getTime();
  const refreshInterval = timefilter.timefilter.getRefreshInterval();

  return (props: SearchBarOwnProps) => (
    <KibanaContextProvider services={{ ...core }}>
      <SearchBar
        savedObjects={core.savedObjects}
        notifications={core.notifications}
        store={storage}
        timeHistory={timefilter.history}
        dateRangeFrom={timeRange.from}
        dateRangeTo={timeRange.to}
        refreshInterval={refreshInterval.value}
        isRefreshPaused={refreshInterval.pause}
        filters={filterManager.getFilters()}
        onFiltersUpdated={defaultFiltersUpdated(filterManager)}
        onRefreshChange={defaultOnRefreshChange(timefilter)}
        {...props}
      />
    </KibanaContextProvider>
  );
}
