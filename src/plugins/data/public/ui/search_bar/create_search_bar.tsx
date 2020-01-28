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
import { CoreStart } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { KibanaContextProvider } from '../../../../kibana_react/public';
import { DataPublicPluginStart, esFilters, Query, TimeRange, SavedQuery } from '../..';
import { QueryStart } from '../../query';
import { SearchBarOwnProps, SearchBar } from './search_bar';

interface StatefulSearchBarDeps {
  core: CoreStart;
  data: Omit<DataPublicPluginStart, 'ui'>;
  storage: IStorageWrapper;
}

export type StatefulSearchBarProps = SearchBarOwnProps & {
  appName: string;
};

const defaultFiltersUpdated = (queryService: QueryStart) => {
  return (filters: esFilters.Filter[]) => {
    queryService.filterManager.setFilters(filters);
  };
};

const defaultOnRefreshChange = (queryService: QueryStart) => {
  const { timefilter } = queryService.timefilter;
  return (options: { isPaused: boolean; refreshInterval: number }) => {
    timefilter.setRefreshInterval({
      value: options.refreshInterval,
      pause: options.isPaused,
    });
  };
};

const defaultOnQuerySubmit = (
  props: StatefulSearchBarProps,
  queryService: QueryStart,
  currentQuery: Query,
  setQueryStringState: Function
) => {
  const { timefilter } = queryService.timefilter;

  return (payload: { dateRange: TimeRange; query?: Query }) => {
    const isUpdate =
      !_.isEqual(timefilter.getTime(), payload.dateRange) ||
      !_.isEqual(payload.query, currentQuery);
    timefilter.setTime(payload.dateRange);
    setQueryStringState(payload.query);

    if (props.onQuerySubmit && isUpdate) props.onQuerySubmit(payload);
  };
};

const defaultOnClearSavedQuery = (
  props: StatefulSearchBarProps,
  uiSettings: CoreStart['uiSettings'],
  queryService: QueryStart,
  setQueryStringState: Function
) => {
  return () => {
    queryService.filterManager.removeAll();
    setQueryStringState({
      query: '',
      language: uiSettings.get('search:queryLanguage'),
    });

    if (props.onClearSavedQuery) props.onClearSavedQuery();
  };
};

const populateStateFromSavedQuery = (
  props: StatefulSearchBarProps,
  queryService: QueryStart,
  savedQuery: SavedQuery,
  setQueryStringState: Function
) => {
  const { timefilter } = queryService.timefilter;
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
  if (props.onQuerySubmit)
    props.onQuerySubmit({ dateRange: timefilter.getTime(), query: savedQuery.attributes.query });

  // filters
  const savedQueryFilters = savedQuery.attributes.filters || [];
  const globalFilters = queryService.filterManager.getGlobalFilters();
  queryService.filterManager.setFilters([...globalFilters, ...savedQueryFilters]);
};

const defaultOnSavedQueryUpdated = (
  props: StatefulSearchBarProps,
  queryService: QueryStart,
  setQueryStringState: Function
) => {
  return (savedQuery: SavedQuery) => {
    populateStateFromSavedQuery(props, queryService, savedQuery, setQueryStringState);
    if (props.onSavedQueryUpdated) props.onSavedQueryUpdated(savedQuery);
  };
};

const defaultOnQuerySaved = (
  props: StatefulSearchBarProps,
  queryService: QueryStart,
  setQueryStringState: Function
) => {
  return (savedQuery: SavedQuery) => {
    populateStateFromSavedQuery(props, queryService, savedQuery, setQueryStringState);
    if (props.onSaved) props.onSaved(savedQuery);
  };
};

export function createSearchBar({ core, storage, data }: StatefulSearchBarDeps) {
  // App name should come from the core application service.
  // Until it's available, we'll ask the user to provide it for the pre-wired component.
  return (props: StatefulSearchBarProps) => {
    const { filterManager, timefilter } = data.query;
    const tfRefreshInterval = timefilter.timefilter.getRefreshInterval();
    const fmFilters = filterManager.getFilters();
    const [refreshInterval, setRefreshInterval] = useState(tfRefreshInterval.value);
    const [refreshPaused, setRefreshPaused] = useState(tfRefreshInterval.pause);
    const [query, setQuery] = useState<Query>({
      query: props.query?.query || '',
      language: props.query?.language || core.uiSettings.get('search:queryLanguage'),
    });

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
    }, [filterManager, timefilter.timefilter]);

    return (
      <KibanaContextProvider
        services={{
          appName: props.appName,
          data,
          storage,
          ...core,
        }}
      >
        <SearchBar
          {...props}
          timeHistory={timefilter.history}
          dateRangeFrom={timeRange.from}
          dateRangeTo={timeRange.to}
          refreshInterval={refreshInterval}
          isRefreshPaused={refreshPaused}
          filters={filters}
          query={query}
          onFiltersUpdated={defaultFiltersUpdated(data.query)}
          onRefreshChange={defaultOnRefreshChange(data.query)}
          onQuerySubmit={defaultOnQuerySubmit(props, data.query, query, setQuery)}
          onClearSavedQuery={defaultOnClearSavedQuery(props, core.uiSettings, data.query, setQuery)}
          onSavedQueryUpdated={defaultOnSavedQueryUpdated(props, data.query, setQuery)}
          onSaved={defaultOnQuerySaved(props, data.query, setQuery)}
        />
      </KibanaContextProvider>
    );
  };
}
