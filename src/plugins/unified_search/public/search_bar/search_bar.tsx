/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { compact, isEqual } from 'lodash';
import classNames from 'classnames';
import { EuiIconProps, useEuiTheme } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { isOfQueryType } from '@kbn/es-query';
import { METRIC_TYPE } from '@kbn/analytics';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Query, Filter, TimeRange, AggregateQuery } from '@kbn/es-query';
import type { TimeHistoryContract, SavedQuery } from '@kbn/data-plugin/public';
import type { SavedQueryAttributes } from '@kbn/data-plugin/common';

import QueryBarTopRow from '../query_string_input/query_bar_top_row';
import { QueryBarMenu } from '../query_string_input/query_bar_menu';
import { FilterBar, FilterItems } from '../filter_bar';
import { searchBarStyles } from './search_bar.styles';
import { MemoizedSavedQueryManagement } from './memoized_saved_query_management';
import { SaveQueryForm } from '../saved_query_form';
import type { SavedQueryMeta } from '../saved_query_form';
import type { QueryBarTopRowProps } from '../query_string_input/query_bar_top_row';
import type { QueryBarMenuProps } from '../query_string_input/query_bar_menu';
import type { DataViewPickerProps, OnSaveTextLanguageQueryProps } from '../dataview_picker';
import type { SuggestionsListSize } from '../typeahead/suggestions_component';
import type { IUnifiedSearchPluginServices } from '../types';

export interface SearchBarInjectedDeps {
  timeHistory?: TimeHistoryContract;
  // Filter bar
  onFiltersUpdated?: (filters: Filter[]) => void;
  // Autorefresh
  onRefreshChange?: (options: { isPaused: boolean; refreshInterval: number }) => void;
}

export interface SearchBarOwnProps<QT extends AggregateQuery | Query = Query> {
  customSubmitButton?: React.ReactNode;
  dataTestSubj?: string;
  dataViewPickerComponentProps?: DataViewPickerProps;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  // defines padding and border; use 'inPage' to avoid any padding or border;
  // use 'detached' if the searchBar appears at the very top of the view, without any wrapper
  displayStyle?: 'inPage' | 'detached';
  // super update button background fill control
  fillSubmitButton?: boolean;
  filters?: Filter[];
  hiddenFilterPanelOptions?: QueryBarMenuProps['hiddenPanelOptions'];
  iconType?: EuiIconProps['type'];
  indexPatterns?: DataView[];
  indicateNoData?: boolean;
  isClearable?: boolean;
  // Disables all inputs and interactive elements
  isDisabled?: boolean;
  isLoading?: boolean;
  isRefreshPaused?: boolean;
  isScreenshotMode?: boolean;
  placeholder?: string;
  nonKqlMode?: 'lucene' | 'text';
  // Query bar - should be in SearchBarInjectedDeps
  query?: QT | Query;
  refreshInterval?: number;
  savedQuery?: SavedQuery;
  screenTitle?: string;
  showAutoRefreshOnly?: boolean;
  showDatePicker?: boolean;
  showFilterBar?: boolean;
  showQueryMenu?: boolean;
  showQueryInput?: boolean;
  showSaveQuery?: boolean;
  showSubmitButton?: boolean;
  submitButtonStyle?: QueryBarTopRowProps['submitButtonStyle'];
  // defines size of suggestions query popover
  suggestionsSize?: SuggestionsListSize;
  textBasedLanguageModeErrors?: Error[];
  // User has cleared the active query, your app should clear the entire query bar
  onClearSavedQuery?: () => void;
  onQueryChange?: (payload: { dateRange: TimeRange; query?: QT | Query }) => void;
  onQuerySubmit?: (
    payload: { dateRange: TimeRange; query?: QT | Query },
    isUpdate?: boolean
  ) => void;
  onRefresh?: (payload: { dateRange: TimeRange }) => void;
  // User has saved the current state as a saved query
  onSaved?: (savedQuery: SavedQuery) => void;
  // User has modified the saved query, your app should persist the update
  onSavedQueryUpdated?: (savedQuery: SavedQuery) => void;
  onTextBasedSavedAndExit?: ({ onSave }: OnSaveTextLanguageQueryProps) => void;
}

export type SearchBarProps<QT extends Query | AggregateQuery = Query> = SearchBarOwnProps<QT> &
  SearchBarInjectedDeps;

function SearchBarUI<QT extends (Query | AggregateQuery) | Query = Query>({
  customSubmitButton,
  dateRangeFrom,
  dateRangeTo,
  dataTestSubj,
  dataViewPickerComponentProps,
  displayStyle,
  fillSubmitButton,
  filters,
  hiddenFilterPanelOptions,
  iconType,
  indexPatterns,
  indicateNoData,
  isClearable,
  isDisabled,
  isLoading,
  isRefreshPaused,
  isScreenshotMode,
  nonKqlMode,
  placeholder,
  query,
  refreshInterval,
  savedQuery,
  screenTitle,
  showAutoRefreshOnly = false,
  showDatePicker = true,
  showFilterBar = true,
  showSaveQuery,
  showSubmitButton = true,
  showQueryInput,
  showQueryMenu = true,
  submitButtonStyle,
  suggestionsSize,
  textBasedLanguageModeErrors,
  timeHistory,
  onClearSavedQuery,
  onFiltersUpdated,
  onQueryChange,
  onQuerySubmit,
  onRefresh,
  onRefreshChange,
  onSaved,
  onSavedQueryUpdated,
  onTextBasedSavedAndExit,
}: SearchBarProps<QT>) {
  const {
    appName,
    data: {
      query: { savedQueries },
    },
    notifications,
    usageCollection: { reportUiCounter } = {},
  } = useKibana<IUnifiedSearchPluginServices>().services;

  const theme = useEuiTheme();
  const styles = searchBarStyles(theme);
  const cssStyles = [
    styles.uniSearchBar,
    displayStyle && styles[displayStyle],
    isScreenshotMode && styles.hidden,
  ];
  const classes = classNames('uniSearchBar', {
    [`uniSearchBar--hidden`]: isScreenshotMode,
    [`uniSearchBar--${displayStyle}`]: displayStyle,
  });

  const [stateQuery, setStateQuery] = useState<QT | Query | AggregateQuery | undefined>(
    query ? { ...query } : undefined
  );
  const [stateDateRangeFrom, setStateDateRangeFrom] = useState<string | undefined>(
    dateRangeFrom ?? 'now-15m'
  );
  const [stateDateRangeTo, setStateDateRangeTo] = useState<string | undefined>(
    dateRangeTo ?? 'now'
  );
  const [stateOpenQueryBarMenu, setStateOpenQueryBarMenu] = useState(false);

  useEffect(() => {
    if (!query) {
      if (stateQuery) {
        setStateQuery(undefined);
      }
    }

    if (query) {
      // 'query' is a Query
      if (isOfQueryType(query)) {
        if (isOfQueryType(stateQuery)) {
          if (stateQuery?.language !== query?.language) {
            setStateQuery({ query: '', language: query.language });
          }
        }
      }

      // 'query' is an AggregateQuery
      if (!isOfQueryType(query)) {
        if (!isEqual(query, stateQuery)) {
          setStateQuery({ ...query });
        }
      }
    }
  }, [query, stateQuery]);

  const timeRangeForSuggestionsOverride = showDatePicker ? undefined : false;

  const shouldRenderFilterBar =
    showFilterBar && filters && indexPatterns && compact(indexPatterns).length > 0;

  const shouldShowDatePickerAsBadge = shouldRenderFilterBar && !showQueryInput;

  const shouldRenderTimeFilterInSavedQueryForm = () => {
    if (!showDatePicker && dateRangeFrom !== undefined && dateRangeTo !== undefined) {
      return false;
    }
    if (indexPatterns?.length) {
      // return true if at least one of the DateView has timeFieldName
      return indexPatterns.some((dataView) => Boolean(dataView.timeFieldName));
    }
    return true;
  };

  const isDirty = () => {
    if (!showDatePicker && stateQuery && query) {
      return !isEqual(stateQuery, query);
    }

    return (
      (stateQuery && query && !isEqual(stateQuery, query)) ||
      dateRangeFrom !== stateDateRangeFrom ||
      dateRangeTo !== stateDateRangeTo
    );
  };

  const handleSave = async (
    { title, description, shouldIncludeFilters, shouldIncludeTimefilter, id }: SavedQueryMeta,
    saveAsNew = false
  ) => {
    if (!stateQuery) return;

    const savedQueryAttributes: SavedQueryAttributes = {
      title,
      description,
      query: stateQuery as Query,
    };

    if (shouldIncludeFilters) {
      savedQueryAttributes.filters = filters;
    }

    if (
      shouldIncludeTimefilter &&
      stateDateRangeTo !== undefined &&
      stateDateRangeFrom !== undefined &&
      refreshInterval !== undefined &&
      isRefreshPaused !== undefined
    ) {
      savedQueryAttributes.timefilter = {
        from: stateDateRangeFrom,
        to: stateDateRangeTo,
        refreshInterval: {
          value: refreshInterval,
          pause: isRefreshPaused,
        },
      };
    }

    try {
      const response =
        savedQuery && !saveAsNew
          ? await savedQueries.updateQuery(id!, savedQueryAttributes)
          : await savedQueries.createQuery(savedQueryAttributes);

      onSaved?.(response);

      notifications.toasts.addSuccess(
        i18n.translate('unifiedSearch.searchBar.querySavedSuccessfully', {
          defaultMessage: 'Your query "{title}" was saved',
          values: { title: response.attributes.title },
        })
      );
    } catch (error) {
      notifications.toasts.addDanger(
        i18n.translate('unifiedSearch.searchBar.querySavedError', {
          defaultMessage: 'An error occured while saving your query: {errorMessage}',
          values: { errorMessage: error.message },
        })
      );
      throw error;
    }
  };

  const handleLoadSavedQuery = (newSavedQuery: SavedQuery) => {
    setStateQuery(newSavedQuery.attributes.query);
    setStateDateRangeFrom(newSavedQuery.attributes.timefilter?.from || stateDateRangeFrom);
    setStateDateRangeTo(newSavedQuery.attributes.timefilter?.to || stateDateRangeTo);

    onSavedQueryUpdated?.(newSavedQuery);
  };

  const handleQueryBarChange = (queryAndDateRange: {
    dateRange: TimeRange;
    query?: QT | Query;
  }) => {
    setStateQuery(queryAndDateRange.query);
    setStateDateRangeFrom(queryAndDateRange.dateRange.from);
    setStateDateRangeTo(queryAndDateRange.dateRange.to);

    onQueryChange?.(queryAndDateRange);
  };

  const handleTextLangQueryChange = (newQuery?: AggregateQuery) => {
    setStateQuery(newQuery as QT);

    onQueryChange?.({
      query: newQuery as QT,
      dateRange: {
        from: stateDateRangeFrom || '',
        to: stateDateRangeTo || '',
      },
    });
  };

  const handleTextLangQuerySubmit = (newQuery?: Query | AggregateQuery) => {
    // clean up all filters
    onFiltersUpdated?.([]);

    setStateQuery(newQuery as QT);

    onQuerySubmit?.({
      query: newQuery as Query,
      dateRange: {
        from: stateDateRangeFrom || '',
        to: stateDateRangeTo || '',
      },
    });

    reportUiCounter?.(appName, METRIC_TYPE.CLICK, 'query_submitted');
  };

  const handleQueryBarSubmit = ({
    dateRange: newDateRange,
    query: newQuery,
  }: {
    dateRange?: TimeRange;
    query?: QT | Query;
  }) => {
    setStateQuery(newQuery);
    setStateDateRangeFrom(newDateRange?.from || stateDateRangeFrom);
    setStateDateRangeTo(newDateRange?.to || stateDateRangeTo);

    onQuerySubmit?.({
      query: newQuery as Query,
      dateRange: {
        from: newDateRange?.from || stateDateRangeFrom || '',
        to: newDateRange?.to || stateDateRangeTo || '',
      },
    });

    reportUiCounter?.(appName, METRIC_TYPE.CLICK, 'query_submitted');
  };

  const handleCloseQueryBarMenu = () => setStateOpenQueryBarMenu(false);

  const toggleFilterBarMenuPopover = (open: boolean) => setStateOpenQueryBarMenu(open);

  console.log('stateQuery', stateQuery);

  return (
    <div className={classes} css={cssStyles} data-test-subj="globalQueryBar">
      <QueryBarTopRow<QT>
        customSubmitButton={customSubmitButton ? customSubmitButton : undefined}
        dataTestSubj={dataTestSubj}
        dataViewPickerComponentProps={dataViewPickerComponentProps}
        dateRangeFrom={stateDateRangeFrom}
        dateRangeTo={stateDateRangeTo}
        fillSubmitButton={Boolean(fillSubmitButton)}
        filterBar={
          shouldRenderFilterBar ? (
            shouldShowDatePickerAsBadge ? (
              <FilterItems
                filters={filters!}
                hiddenPanelOptions={hiddenFilterPanelOptions}
                indexPatterns={indexPatterns!}
                readOnly={isDisabled}
                timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
                onFiltersUpdated={onFiltersUpdated}
              />
            ) : (
              <FilterBar
                afterQueryBar
                data-test-subj="unifiedFilterBar"
                filters={filters!}
                hiddenPanelOptions={hiddenFilterPanelOptions}
                indexPatterns={indexPatterns!}
                isDisabled={isDisabled}
                timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
                onFiltersUpdated={onFiltersUpdated}
              />
            )
          ) : undefined
        }
        filters={filters!}
        iconType={iconType}
        indexPatterns={indexPatterns}
        indicateNoData={indicateNoData}
        isClearable={isClearable}
        isDirty={isDirty()}
        isDisabled={isDisabled}
        isLoading={isLoading}
        isRefreshPaused={isRefreshPaused}
        isScreenshotMode={isScreenshotMode}
        nonKqlMode={nonKqlMode}
        placeholder={placeholder}
        prepend={
          (showFilterBar || showQueryInput) && showQueryMenu ? (
            <QueryBarMenu
              buttonProps={{ size: shouldShowDatePickerAsBadge ? 's' : 'm' }}
              dateRangeFrom={stateDateRangeFrom}
              dateRangeTo={stateDateRangeTo}
              filters={filters}
              hiddenPanelOptions={hiddenFilterPanelOptions}
              indexPatterns={indexPatterns}
              isDisabled={isDisabled}
              language={stateQuery && isOfQueryType(stateQuery) ? stateQuery?.language : 'kuery'}
              manageFilterSetComponent={
                showFilterBar && stateQuery && onClearSavedQuery ? (
                  <MemoizedSavedQueryManagement
                    filters={filters}
                    query={query}
                    savedQuery={savedQuery}
                    showSaveQuery={showSaveQuery}
                    onClearSavedQuery={onClearSavedQuery}
                    onClose={handleCloseQueryBarMenu}
                    onLoadSavedQuery={handleLoadSavedQuery}
                  />
                ) : undefined
              }
              nonKqlMode={nonKqlMode}
              openQueryBarMenu={stateOpenQueryBarMenu}
              query={stateQuery as Query}
              savedQuery={savedQuery}
              showFilterBar={showFilterBar}
              showQueryInput={showQueryInput}
              showSaveQuery={showSaveQuery}
              timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
              toggleFilterBarMenuPopover={toggleFilterBarMenuPopover}
              saveAsNewQueryFormComponent={
                <SaveQueryForm
                  savedQueryService={savedQueries}
                  onSave={(savedQueryMeta) => handleSave(savedQueryMeta, true)}
                  onClose={handleCloseQueryBarMenu}
                  showFilterOption={showFilterBar}
                  showTimeFilterOption={shouldRenderTimeFilterInSavedQueryForm()}
                />
              }
              saveFormComponent={
                <SaveQueryForm
                  savedQuery={savedQuery ? savedQuery : undefined}
                  savedQueryService={savedQueries}
                  onSave={handleSave}
                  onClose={handleCloseQueryBarMenu}
                  showFilterOption={showFilterBar}
                  showTimeFilterOption={shouldRenderTimeFilterInSavedQueryForm()}
                />
              }
              savedQueryService={savedQueries}
              onClearSavedQuery={onClearSavedQuery}
              onFiltersUpdated={onFiltersUpdated}
              onQueryBarSubmit={handleQueryBarSubmit}
              onQueryChange={handleQueryBarChange}
            />
          ) : undefined
        }
        query={stateQuery as Query}
        refreshInterval={refreshInterval}
        screenTitle={screenTitle}
        showAddFilter={showFilterBar}
        showAutoRefreshOnly={showAutoRefreshOnly}
        showDatePicker={showDatePicker}
        showDatePickerAsBadge={shouldShowDatePickerAsBadge}
        showQueryInput={showQueryInput}
        showSubmitButton={showSubmitButton}
        submitButtonStyle={submitButtonStyle}
        suggestionsSize={suggestionsSize}
        textBasedLanguageModeErrors={textBasedLanguageModeErrors}
        timeHistory={timeHistory}
        timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
        onChange={handleQueryBarChange}
        onFiltersUpdated={onFiltersUpdated}
        onRefresh={onRefresh}
        onRefreshChange={onRefreshChange}
        onSubmit={handleQueryBarSubmit}
        onTextBasedSavedAndExit={onTextBasedSavedAndExit}
        onTextLangQueryChange={handleTextLangQueryChange}
        onTextLangQuerySubmit={handleTextLangQuerySubmit}
      />
    </div>
  );
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default SearchBarUI;
