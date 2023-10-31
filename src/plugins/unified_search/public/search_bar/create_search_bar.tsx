/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import React, { useEffect, useRef } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { QueryStart, SavedQuery, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { Query, AggregateQuery } from '@kbn/es-query';
import type { Filter, TimeRange } from '@kbn/es-query';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { SearchBar } from '.';
import type { SearchBarOwnProps } from '.';
import { useFilterManager } from './lib/use_filter_manager';
import { useTimefilter } from './lib/use_timefilter';
import { useSavedQuery } from './lib/use_saved_query';
import { useQueryStringManager } from './lib/use_query_string_manager';
import { type SavedQueryMenuVisibility, canShowSavedQuery } from './lib/can_show_saved_query';
import type { UnifiedSearchPublicPluginStart } from '../types';

export interface StatefulSearchBarDeps {
  core: CoreStart;
  data: DataPublicPluginStart;
  storage: IStorageWrapper;
  usageCollection?: UsageCollectionSetup;
  isScreenshotMode?: boolean;
  unifiedSearch: Omit<UnifiedSearchPublicPluginStart, 'ui'>;
}

export type StatefulSearchBarProps<QT extends Query | AggregateQuery = Query> = Omit<
  SearchBarOwnProps<QT>,
  'showSaveQuery'
> & {
  appName: string;
  useDefaultBehaviors?: boolean;
  savedQueryId?: string;
  saveQueryMenuVisibility?: SavedQueryMenuVisibility;
  onSavedQueryIdChange?: (savedQueryId?: string) => void;
  onFiltersUpdated?: (filters: Filter[]) => void;
};

// Respond to user changing the filters
const defaultFiltersUpdated = (
  queryService: QueryStart,
  onFiltersUpdated?: (filters: Filter[]) => void
) => {
  return (filters: Filter[]) => {
    if (onFiltersUpdated) {
      onFiltersUpdated(filters);
    } else {
      queryService.filterManager.setFilters(filters);
    }
  };
};

// Respond to user changing the refresh settings
const defaultOnRefreshChange = (
  queryService: QueryStart,
  onRefreshChange?: (payload: { isPaused: boolean; refreshInterval: number }) => void
) => {
  const { timefilter } = queryService.timefilter;
  return (options: { isPaused: boolean; refreshInterval: number }) => {
    timefilter.setRefreshInterval({
      value: options.refreshInterval,
      pause: options.isPaused,
    });
    if (onRefreshChange) {
      onRefreshChange({
        refreshInterval: options.refreshInterval,
        isPaused: options.isPaused,
      });
    }
  };
};

// Respond to user changing the query string or time settings
const defaultOnQuerySubmit = <QT extends AggregateQuery | Query = Query>(
  props: StatefulSearchBarProps<QT>,
  queryService: QueryStart,
  currentQuery: QT | Query
) => {
  if (!props.useDefaultBehaviors) return props.onQuerySubmit;

  const { timefilter } = queryService.timefilter;

  return (payload: { dateRange: TimeRange; query?: QT | Query }) => {
    const isUpdate =
      !isEqual(timefilter.getTime(), payload.dateRange) || !isEqual(payload.query, currentQuery);
    if (isUpdate) {
      timefilter.setTime(payload.dateRange);
      if (payload.query) {
        queryService.queryString.setQuery(payload.query);
      } else {
        queryService.queryString.clearQuery();
      }
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
const defaultOnClearSavedQuery = <QT extends AggregateQuery | Query = Query>(
  props: StatefulSearchBarProps<QT>,
  clearSavedQuery: Function
) => {
  if (!props.useDefaultBehaviors) return props.onClearSavedQuery;
  return () => {
    clearSavedQuery();
    if (props.onSavedQueryIdChange) props.onSavedQueryIdChange();
  };
};

// Respond to user saving or updating a saved query
const defaultOnSavedQueryUpdated = <QT extends AggregateQuery | Query = Query>(
  props: StatefulSearchBarProps<QT>,
  setSavedQuery: Function
) => {
  if (!props.useDefaultBehaviors) return props.onSavedQueryUpdated;
  return (savedQuery: SavedQuery) => {
    setSavedQuery(savedQuery);
    if (props.onSavedQueryIdChange) props.onSavedQueryIdChange(savedQuery.id);
  };
};

const overrideDefaultBehaviors = <QT extends AggregateQuery | Query = Query>(
  props: StatefulSearchBarProps<QT>
) => {
  return props.useDefaultBehaviors ? {} : props;
};

export function createSearchBar({
  core,
  storage,
  data,
  usageCollection,
  isScreenshotMode = false,
  unifiedSearch,
}: StatefulSearchBarDeps) {
  // App name should come from the core application service.
  // Until it's available, we'll ask the user to provide it for the pre-wired component.
  return <QT extends AggregateQuery | Query = Query>(props: StatefulSearchBarProps<QT>) => {
    const { useDefaultBehaviors } = props;
    // Handle queries
    const onQuerySubmitRef = useRef(props.onQuerySubmit);

    useEffect(() => {
      onQuerySubmitRef.current = props.onQuerySubmit;
    }, [props.onQuerySubmit]);
    // handle service state updates.
    // i.e. filters being added from a visualization directly to filterManager.
    const { filters } = useFilterManager({
      filters: props.filters,
      filterManager: data.query.filterManager,
    });
    const { query } = useQueryStringManager({
      query: props.query,
      queryStringManager: data.query.queryString,
    }) as { query: QT };
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
      savedQueryId: props.savedQueryId,
      notifications: core.notifications,
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

    const showSaveQuery = canShowSavedQuery({
      saveQueryMenuVisibility: props.saveQueryMenuVisibility,
      query,
      core,
    });

    return (
      <KibanaContextProvider
        services={{
          appName: props.appName,
          data,
          storage,
          usageCollection,
          unifiedSearch,
          ...core,
        }}
      >
        <core.i18n.Context>
          <SearchBar
            showAutoRefreshOnly={props.showAutoRefreshOnly}
            showDatePicker={props.showDatePicker}
            showFilterBar={props.showFilterBar}
            showQueryMenu={props.showQueryMenu}
            showQueryInput={props.showQueryInput}
            showSaveQuery={showSaveQuery}
            showSubmitButton={props.showSubmitButton}
            submitButtonStyle={props.submitButtonStyle}
            isDisabled={props.isDisabled}
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
            onFiltersUpdated={defaultFiltersUpdated(data.query, props.onFiltersUpdated)}
            onRefreshChange={
              !props.isAutoRefreshDisabled
                ? defaultOnRefreshChange(data.query, props.onRefreshChange)
                : undefined
            }
            savedQuery={savedQuery}
            onQuerySubmit={defaultOnQuerySubmit(props, data.query, query)}
            onRefresh={props.onRefresh}
            onClearSavedQuery={defaultOnClearSavedQuery(props, clearSavedQuery)}
            onSavedQueryUpdated={defaultOnSavedQueryUpdated(props, setSavedQuery)}
            onSaved={defaultOnSavedQueryUpdated(props, setSavedQuery)}
            iconType={props.iconType}
            nonKqlMode={props.nonKqlMode}
            customSubmitButton={props.customSubmitButton}
            dataViewPickerOverride={props.dataViewPickerOverride}
            isClearable={props.isClearable}
            placeholder={props.placeholder}
            {...overrideDefaultBehaviors(props)}
            dataViewPickerComponentProps={props.dataViewPickerComponentProps}
            textBasedLanguageModeErrors={props.textBasedLanguageModeErrors}
            textBasedLanguageModeWarning={props.textBasedLanguageModeWarning}
            onTextBasedSavedAndExit={props.onTextBasedSavedAndExit}
            displayStyle={props.displayStyle}
            isScreenshotMode={isScreenshotMode}
            dataTestSubj={props.dataTestSubj}
            filtersForSuggestions={props.filtersForSuggestions}
            prependFilterBar={props.prependFilterBar}
          />
        </core.i18n.Context>
      </KibanaContextProvider>
    );
  };
}
