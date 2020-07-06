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
import React, { useState, useEffect, useRef } from 'react';
import { CoreStart } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { KibanaContextProvider } from '../../../../kibana_react/public';
import { QueryStart, SavedQuery } from '../../query';
import { SearchBarOwnProps, SearchBar } from './search_bar';
import { useFilterManager } from './lib/use_filter_manager';
import { useTimefilter } from './lib/use_timefilter';
import { useSavedQuery } from './lib/use_saved_query';
import { DataPublicPluginStart } from '../../types';
import { Filter, Query, TimeRange, UI_SETTINGS } from '../../../common';

interface StatefulSearchBarDeps {
  core: CoreStart;
  data: Omit<DataPublicPluginStart, 'ui'>;
  storage: IStorageWrapper;
}

export type StatefulSearchBarProps = SearchBarOwnProps & {
  appName: string;
  useDefaultBehaviors?: boolean;
  savedQueryId?: string;
  onSavedQueryIdChange?: (savedQueryId?: string) => void;
};

// Respond to user changing the filters
const defaultFiltersUpdated = (queryService: QueryStart) => {
  return (filters: Filter[]) => {
    queryService.filterManager.setFilters(filters);
  };
};

// Respond to user changing the refresh settings
const defaultOnRefreshChange = (queryService: QueryStart) => {
  const { timefilter } = queryService.timefilter;
  return (options: { isPaused: boolean; refreshInterval: number }) => {
    timefilter.setRefreshInterval({
      value: options.refreshInterval,
      pause: options.isPaused,
    });
  };
};

// Respond to user changing the query string or time settings
const defaultOnQuerySubmit = (
  props: StatefulSearchBarProps,
  queryService: QueryStart,
  currentQuery: Query,
  setQueryStringState: Function
) => {
  if (!props.useDefaultBehaviors) return props.onQuerySubmit;

  const { timefilter } = queryService.timefilter;

  return (payload: { dateRange: TimeRange; query?: Query }) => {
    const isUpdate =
      !_.isEqual(timefilter.getTime(), payload.dateRange) ||
      !_.isEqual(payload.query, currentQuery);
    if (isUpdate) {
      timefilter.setTime(payload.dateRange);
      setQueryStringState(payload.query);
    } else {
      // Refresh button triggered for an update
      if (props.onQuerySubmit)
        props.onQuerySubmit(
          {
            dateRange: timefilter.getTime(),
            query: currentQuery,
          },
          false
        );
    }
  };
};

// Respond to user clearing a saved query
const defaultOnClearSavedQuery = (props: StatefulSearchBarProps, clearSavedQuery: Function) => {
  if (!props.useDefaultBehaviors) return props.onClearSavedQuery;
  return () => {
    clearSavedQuery();
    if (props.onSavedQueryIdChange) props.onSavedQueryIdChange();
  };
};

// Respond to user saving or updating a saved query
const defaultOnSavedQueryUpdated = (props: StatefulSearchBarProps, setSavedQuery: Function) => {
  if (!props.useDefaultBehaviors) return props.onSavedQueryUpdated;
  return (savedQuery: SavedQuery) => {
    setSavedQuery(savedQuery);
    if (props.onSavedQueryIdChange) props.onSavedQueryIdChange(savedQuery.id);
  };
};

const overrideDefaultBehaviors = (props: StatefulSearchBarProps) => {
  return props.useDefaultBehaviors ? {} : props;
};

export function createSearchBar({ core, storage, data }: StatefulSearchBarDeps) {
  // App name should come from the core application service.
  // Until it's available, we'll ask the user to provide it for the pre-wired component.
  return (props: StatefulSearchBarProps) => {
    const { useDefaultBehaviors } = props;
    // Handle queries
    const queryRef = useRef(props.query);
    const onQuerySubmitRef = useRef(props.onQuerySubmit);
    const defaultQuery = {
      query: '',
      language:
        storage.get('kibana.userQueryLanguage') ||
        core.uiSettings.get(UI_SETTINGS.SEARCH_QUERY_LANGUAGE),
    };
    const [query, setQuery] = useState<Query>(props.query || defaultQuery);

    useEffect(() => {
      if (props.query !== queryRef.current) {
        queryRef.current = props.query;
        setQuery(props.query || defaultQuery);
      }
      /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [defaultQuery, props.query]);

    useEffect(() => {
      if (props.onQuerySubmit !== onQuerySubmitRef.current) {
        onQuerySubmitRef.current = props.onQuerySubmit;
      }
      /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [props.onQuerySubmit]);

    // handle service state updates.
    // i.e. filters being added from a visualization directly to filterManager.
    const { filters } = useFilterManager({
      filters: props.filters,
      filterManager: data.query.filterManager,
    });
    const { timeRange, refreshInterval } = useTimefilter({
      dateRangeFrom: props.dateRangeFrom,
      dateRangeTo: props.dateRangeTo,
      refreshInterval: props.refreshInterval,
      isRefreshPaused: props.isRefreshPaused,
      timefilter: data.query.timefilter.timefilter,
    });

    // Fetch and update UI from saved query
    const { savedQuery, setSavedQuery, clearSavedQuery } = useSavedQuery({
      queryService: data.query,
      setQuery,
      savedQueryId: props.savedQueryId,
      notifications: core.notifications,
      defaultLanguage: defaultQuery.language,
    });

    // Fire onQuerySubmit on query or timerange change
    useEffect(() => {
      if (!useDefaultBehaviors || !onQuerySubmitRef.current) return;
      onQuerySubmitRef.current(
        {
          dateRange: timeRange,
          query,
        },
        true
      );
    }, [query, timeRange, useDefaultBehaviors]);

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
          showAutoRefreshOnly={props.showAutoRefreshOnly}
          showDatePicker={props.showDatePicker}
          showFilterBar={props.showFilterBar}
          showQueryBar={props.showQueryBar}
          showQueryInput={props.showQueryInput}
          showSaveQuery={props.showSaveQuery}
          screenTitle={props.screenTitle}
          indexPatterns={props.indexPatterns}
          indicateNoData={props.indicateNoData}
          timeHistory={data.query.timefilter.history}
          dateRangeFrom={timeRange.from}
          dateRangeTo={timeRange.to}
          refreshInterval={refreshInterval.value}
          isRefreshPaused={refreshInterval.pause}
          filters={filters}
          query={query}
          onFiltersUpdated={defaultFiltersUpdated(data.query)}
          onRefreshChange={defaultOnRefreshChange(data.query)}
          savedQuery={savedQuery}
          onQuerySubmit={defaultOnQuerySubmit(props, data.query, query, setQuery)}
          onClearSavedQuery={defaultOnClearSavedQuery(props, clearSavedQuery)}
          onSavedQueryUpdated={defaultOnSavedQueryUpdated(props, setSavedQuery)}
          onSaved={defaultOnSavedQueryUpdated(props, setSavedQuery)}
          {...overrideDefaultBehaviors(props)}
        />
      </KibanaContextProvider>
    );
  };
}
