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

import React, { useState, useEffect } from 'react';
import { Subscription } from 'rxjs';
import { Filter } from '@kbn/es-query';
import { CoreStart } from 'src/core/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { Storage } from '../../../types';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';
import { TimefilterSetup } from '../../../timefilter';
import { FilterManager, SearchBar } from '../../../';
import { SearchBarOwnProps } from '.';

interface StatefulSearchBarDeps {
  core: CoreStart;
  data: DataPublicPluginStart;
  store: Storage;
  timefilter: TimefilterSetup;
  filterManager: FilterManager;
}

export type StatetfulSearchBarProps = SearchBarOwnProps & {
  appName: string;
};

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
  store,
  timefilter,
  filterManager,
  data,
}: StatefulSearchBarDeps) {
  // App name should come from the core application service.
  // Until it's available, we'll ask the user to provide it for the pre-wired component.
  return (props: StatetfulSearchBarProps) => {
    const tfRefreshInterval = timefilter.timefilter.getRefreshInterval();
    const fmFilters = filterManager.getFilters();
    const [refreshInterval, setRefreshInterval] = useState(tfRefreshInterval.value);
    const [refreshPaused, setRefreshPaused] = useState(tfRefreshInterval.pause);

    const [filters, setFilters] = useState(fmFilters);

    // We do not really need to keep track of the time
    // since this is just for initialization
    const timeRange = timefilter.timefilter.getTime();

    useEffect(() => {
      let isSubscribed = true;
      const subscriptions = new Subscription();
      subscriptions.add(
        timefilter.timefilter.getRefreshIntervalUpdate$().subscribe({
          next: () => {
            if (isSubscribed) {
              const newRefreshInterval = timefilter.timefilter.getRefreshInterval();
              setRefreshInterval(newRefreshInterval.value);
              setRefreshPaused(newRefreshInterval.pause);
            }
          },
        })
      );

      subscriptions.add(
        filterManager.getUpdates$().subscribe({
          next: () => {
            if (isSubscribed) {
              const newFilters = filterManager.getFilters();
              setFilters(newFilters);
            }
          },
        })
      );

      return () => {
        isSubscribed = false;
        subscriptions.unsubscribe();
      };
    }, []);

    return (
      <KibanaContextProvider
        services={{
          appName: props.appName,
          data,
          store,
          ...core,
        }}
      >
        <SearchBar
          timeHistory={timefilter.history}
          dateRangeFrom={timeRange.from}
          dateRangeTo={timeRange.to}
          refreshInterval={refreshInterval}
          isRefreshPaused={refreshPaused}
          filters={filters}
          onFiltersUpdated={defaultFiltersUpdated(filterManager)}
          onRefreshChange={defaultOnRefreshChange(timefilter)}
          {...props}
        />
      </KibanaContextProvider>
    );
  };
}
