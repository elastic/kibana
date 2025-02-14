/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compact } from 'lodash';
import { InjectedIntl, injectI18n } from '@kbn/i18n-react';
import classNames from 'classnames';
import React, { Component, createRef } from 'react';
import { EuiIconProps, withEuiTheme, WithEuiThemeProps } from '@elastic/eui';
import { EuiContextMenuClass } from '@elastic/eui/src/components/context_menu/context_menu';
import { get, isEqual } from 'lodash';
import memoizeOne from 'memoize-one';

import { METRIC_TYPE } from '@kbn/analytics';
import {
  type Query,
  type Filter,
  type TimeRange,
  type AggregateQuery,
  isOfQueryType,
  isOfAggregateQueryType,
} from '@kbn/es-query';
import { withKibana, KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import type {
  TimeHistoryContract,
  SavedQuery,
  SavedQueryTimeFilter,
} from '@kbn/data-plugin/public';
import type { SavedQueryAttributes } from '@kbn/data-plugin/common';
import { DataView } from '@kbn/data-views-plugin/public';

import { i18n } from '@kbn/i18n';
import { AdditionalQueryBarMenuItems } from '../query_string_input/query_bar_menu_panels';
import type { IUnifiedSearchPluginServices } from '../types';
import { SavedQueryMeta, SaveQueryForm } from '../saved_query_form';
import { SavedQueryManagementList } from '../saved_query_management';
import { QueryBarMenu, QueryBarMenuProps } from '../query_string_input/query_bar_menu';
import type { DataViewPickerProps } from '../dataview_picker';
import QueryBarTopRow, { QueryBarTopRowProps } from '../query_string_input/query_bar_top_row';
import { FilterBar, FilterItems } from '../filter_bar';
import type {
  SuggestionsAbstraction,
  SuggestionsListSize,
} from '../typeahead/suggestions_component';
import { searchBarStyles } from './search_bar.styles';

export interface SearchBarInjectedDeps {
  kibana: KibanaReactContextValue<IUnifiedSearchPluginServices>;
  intl: InjectedIntl;
  timeHistory?: TimeHistoryContract;
  // Filter bar
  onFiltersUpdated?: (filters: Filter[]) => void;
  // Autorefresh
  onRefreshChange?: (options: { isPaused: boolean; refreshInterval: number }) => void;
}

export interface SearchBarOwnProps<QT extends AggregateQuery | Query = Query> {
  indexPatterns?: DataView[];
  isLoading?: boolean;
  customSubmitButton?: React.ReactNode;
  dataViewPickerOverride?: React.ReactNode;
  screenTitle?: string;
  dataTestSubj?: string;
  // Togglers
  showQueryMenu?: boolean;
  showQueryInput?: boolean;
  showFilterBar?: boolean;
  showDatePicker?: boolean;
  showAutoRefreshOnly?: boolean;
  filters?: Filter[];
  additionalQueryBarMenuItems?: AdditionalQueryBarMenuItems;
  filtersForSuggestions?: Filter[];
  hiddenFilterPanelOptions?: QueryBarMenuProps['hiddenPanelOptions'];
  prependFilterBar?: React.ReactNode;
  // Date picker
  isRefreshPaused?: boolean;
  refreshInterval?: number;
  minRefreshInterval?: number;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  // Query bar - should be in SearchBarInjectedDeps
  query?: QT | Query;
  // Show when user has privileges to save. See `canShowSavedQuery(...)` lib.
  showSaveQuery?: boolean;
  // Show the controls to save and load saved queries
  showSavedQueryControls?: boolean;
  savedQuery?: SavedQuery;
  onQueryChange?: (payload: { dateRange: TimeRange; query?: QT | Query }) => void;
  onQuerySubmit?: (
    payload: { dateRange: TimeRange; query?: QT | Query },
    isUpdate?: boolean
  ) => void;
  // User has saved the current state as a saved query
  onSaved?: (savedQuery: SavedQuery) => void;
  // User has modified the saved query, your app should persist the update
  onSavedQueryUpdated?: (savedQuery: SavedQuery) => void;
  // Execute whenever time range is updated.
  onTimeRangeChange?: (payload: { dateRange: TimeRange }) => void;
  // User has cleared the active query, your app should clear the entire query bar
  onClearSavedQuery?: () => void;

  onRefresh?: (payload: { dateRange: TimeRange }) => void;
  onCancel?: () => void;
  // Autorefresh
  onRefreshChange?: (options: { isPaused: boolean; refreshInterval: number }) => void;
  indicateNoData?: boolean;
  // Disables the default auto-refresh option inside the date picker
  isAutoRefreshDisabled?: boolean;

  placeholder?: string;
  isClearable?: boolean;
  iconType?: EuiIconProps['type'];
  nonKqlMode?: 'lucene' | 'text';
  disableQueryLanguageSwitcher?: boolean;
  // defines padding and border; use 'inPage' to avoid any padding or border;
  // use 'detached' if the searchBar appears at the very top of the view, without any wrapper
  displayStyle?: 'inPage' | 'detached' | 'withBorders';
  // super update button background fill control
  fillSubmitButton?: boolean;
  dataViewPickerComponentProps?: DataViewPickerProps;
  textBasedLanguageModeErrors?: Error[];
  textBasedLanguageModeWarning?: string;
  showSubmitButton?: boolean;
  submitButtonStyle?: QueryBarTopRowProps['submitButtonStyle'];
  // defines size of suggestions query popover
  suggestionsSize?: SuggestionsListSize;
  suggestionsAbstraction?: SuggestionsAbstraction;
  isScreenshotMode?: boolean;

  /**
   * Disables all inputs and interactive elements,
   */
  isDisabled?: boolean;

  submitOnBlur?: boolean;

  renderQueryInputAppend?: () => React.ReactNode;
  onESQLDocsFlyoutVisibilityChanged?: QueryBarTopRowProps['onESQLDocsFlyoutVisibilityChanged'];
}

export type SearchBarProps<QT extends Query | AggregateQuery = Query> = SearchBarOwnProps<QT> &
  SearchBarInjectedDeps;

interface State<QT extends Query | AggregateQuery = Query> {
  isFiltersVisible: boolean;
  openQueryBarMenu: boolean;
  showSavedQueryPopover: boolean;
  currentProps?: SearchBarProps;
  query?: QT | Query;
  dateRangeFrom: string;
  dateRangeTo: string;
}

class SearchBarUI<QT extends (Query | AggregateQuery) | Query = Query> extends Component<
  SearchBarProps<QT> & WithEuiThemeProps,
  State<QT | Query>
> {
  public static defaultProps = {
    showQueryMenu: true,
    showFilterBar: true,
    showDatePicker: true,
    showSubmitButton: true,
    showAutoRefreshOnly: false,
    filtersForSuggestions: [],
    additionalQueryBarMenuItems: [],
  };

  private services = this.props.kibana.services;
  private savedQueryService = this.services.data.query.savedQueries;
  private queryBarMenuRef = createRef<EuiContextMenuClass>();

  public static getDerivedStateFromProps(
    nextProps: SearchBarProps,
    prevState: State<AggregateQuery | Query>
  ) {
    if (isEqual(prevState.currentProps, nextProps)) {
      return null;
    }

    let nextQuery = null;
    if (
      nextProps.query &&
      isOfQueryType(nextProps.query) &&
      nextProps.query.query !== get(prevState, 'currentProps.query.query')
    ) {
      nextQuery = {
        query: nextProps.query.query,
        language: nextProps.query.language,
      };
    } else if (
      nextProps.query &&
      prevState.query &&
      isOfQueryType(nextProps.query) &&
      isOfQueryType(prevState.query) &&
      nextProps.query.language !== prevState.query.language
    ) {
      nextQuery = {
        query: '',
        language: nextProps.query.language,
      };
    } else if (nextProps.query && !isOfQueryType(nextProps.query)) {
      nextQuery = nextProps.query;
    }

    let nextDateRange = null;
    if (
      nextProps.dateRangeFrom !== get(prevState, 'currentProps.dateRangeFrom') ||
      nextProps.dateRangeTo !== get(prevState, 'currentProps.dateRangeTo')
    ) {
      nextDateRange = {
        dateRangeFrom: nextProps.dateRangeFrom,
        dateRangeTo: nextProps.dateRangeTo,
      };
    }

    const nextState: any = {
      currentProps: nextProps,
    };
    if (nextQuery) {
      nextState.query = nextQuery;
    }
    if (nextDateRange) {
      nextState.dateRangeFrom = nextDateRange.dateRangeFrom;
      nextState.dateRangeTo = nextDateRange.dateRangeTo;

      /**
       * Some applications do not rely on the _g url parameter to update the time. The onTimeRangeChange
       * callback can be used in these cases to notify the consumer for the time change.
       */
      if (nextDateRange.dateRangeFrom && nextDateRange.dateRangeTo) {
        nextProps?.onTimeRangeChange?.({
          dateRange: {
            from: nextDateRange.dateRangeFrom,
            to: nextDateRange.dateRangeTo,
          },
        });
      }
    }
    return nextState;
  }

  /*
   Keep the "draft" value in local state until the user actually submits the query. There are a couple advantages:

    1. Each app doesn't have to maintain its own "draft" value if it wants to put off updating the query in app state
    until the user manually submits their changes. Most apps have watches on the query value in app state so we don't
    want to trigger those on every keypress. Also, some apps (e.g. dashboard) already juggle multiple query values,
    each with slightly different semantics and I'd rather not add yet another variable to the mix.

    2. Changes to the local component state won't trigger an Angular digest cycle. Triggering digest cycles on every
    keypress has been a major source of performance issues for us in previous implementations of the query bar.
    See https://github.com/elastic/kibana/issues/14086
  */
  public state = {
    isFiltersVisible: true,
    openQueryBarMenu: false,
    showSavedQueryPopover: false,
    currentProps: this.props,
    query: this.props.query ? { ...this.props.query } : undefined,
    dateRangeFrom: get(this.props, 'dateRangeFrom', 'now-15m'),
    dateRangeTo: get(this.props, 'dateRangeTo', 'now'),
  } as State<QT>;

  public isDirty = () => {
    if (!this.props.showDatePicker && this.state.query && this.props.query) {
      return !isEqual(this.state.query, this.props.query);
    }

    return (
      (this.state.query && this.props.query && !isEqual(this.state.query, this.props.query)) ||
      this.state.dateRangeFrom !== this.props.dateRangeFrom ||
      this.state.dateRangeTo !== this.props.dateRangeTo
    );
  };

  componentWillUnmount() {
    this.renderSavedQueryManagement.clear();
  }

  private shouldRenderFilterBar() {
    return (
      this.props.showFilterBar &&
      this.props.filters &&
      this.props.indexPatterns &&
      compact(this.props.indexPatterns).length > 0
    );
  }

  /*
   * This Function is here to show the toggle in saved query form
   * in case you the date range (from/to)
   */
  private shouldRenderTimeFilterInSavedQueryForm() {
    const { dateRangeFrom, dateRangeTo, showDatePicker, indexPatterns } = this.props;

    if (!showDatePicker && dateRangeFrom !== undefined && dateRangeTo !== undefined) {
      return false;
    }

    if (indexPatterns?.length) {
      // return true if at least one of the DateView has timeFieldName
      return indexPatterns.some((dataView) => Boolean(dataView.timeFieldName));
    }

    return true;
  }

  private getTimeFilter(): SavedQueryTimeFilter | undefined {
    if (
      this.state.dateRangeTo !== undefined &&
      this.state.dateRangeFrom !== undefined &&
      this.props.refreshInterval !== undefined &&
      this.props.isRefreshPaused !== undefined
    ) {
      return {
        from: this.state.dateRangeFrom,
        to: this.state.dateRangeTo,
        refreshInterval: {
          value: this.props.refreshInterval,
          pause: this.props.isRefreshPaused,
        },
      };
    }
  }

  public onSave = async (savedQueryMeta: SavedQueryMeta, saveAsNew = false) => {
    if (!this.state.query) return;

    const savedQueryAttributes: SavedQueryAttributes = {
      title: savedQueryMeta.title,
      description: savedQueryMeta.description,
      query: this.state.query as Query,
    };

    if (savedQueryMeta.shouldIncludeFilters) {
      savedQueryAttributes.filters = this.props.filters;
    }

    const timeFilter = this.getTimeFilter();

    if (savedQueryMeta.shouldIncludeTimefilter && timeFilter) {
      savedQueryAttributes.timefilter = timeFilter;
    }

    try {
      let response;
      if (this.props.savedQuery && !saveAsNew) {
        response = await this.savedQueryService.updateQuery(
          savedQueryMeta.id!,
          savedQueryAttributes
        );
      } else {
        response = await this.savedQueryService.createQuery(savedQueryAttributes);
      }

      this.services.notifications.toasts.addSuccess(
        i18n.translate('unifiedSearch.search.searchBar.saveQuerySuccessMessage', {
          defaultMessage: 'Your query "{queryTitle}" was saved',
          values: {
            queryTitle: response.attributes.title,
          },
        })
      );

      if (this.props.onSaved) {
        this.props.onSaved(response);
      }
    } catch (error) {
      this.services.notifications.toasts.addDanger(
        i18n.translate('unifiedSearch.search.searchBar.saveQueryErrorMessage', {
          defaultMessage: 'An error occured while saving your query: {errorMessage}',
          values: {
            errorMessage: error.message,
          },
        })
      );
      throw error;
    }
  };

  public onQueryBarChange = (queryAndDateRange: { dateRange: TimeRange; query?: QT | Query }) => {
    this.setState({
      query: queryAndDateRange.query,
      dateRangeFrom: queryAndDateRange.dateRange.from,
      dateRangeTo: queryAndDateRange.dateRange.to,
    });
    if (this.props.onQueryChange) {
      this.props.onQueryChange(queryAndDateRange);
    }
  };

  public onTextLangQueryChange = (query?: any) => {
    this.setState({
      query,
    });
    if (this.props.onQueryChange) {
      this.props.onQueryChange({
        query,
        dateRange: {
          from: this.state.dateRangeFrom,
          to: this.state.dateRangeTo,
        },
      });
    }
  };

  public toggleFilterBarMenuPopover = (value: boolean) => {
    this.setState({
      openQueryBarMenu: value,
    });
  };

  public onTextLangQuerySubmit = (query?: Query | AggregateQuery) => {
    // clean up all filters
    this.props.onFiltersUpdated?.([]);
    this.setState(
      {
        query: query as QT,
      },
      () => {
        if (this.props.onQuerySubmit) {
          this.props.onQuerySubmit(
            {
              query: query as QT,
              dateRange: {
                from: this.state.dateRangeFrom,
                to: this.state.dateRangeTo,
              },
            },
            this.isDirty()
          );
        }
      }
    );
  };

  public onQueryBarSubmit = (queryAndDateRange: { dateRange?: TimeRange; query?: QT | Query }) => {
    this.setState(
      {
        query: queryAndDateRange.query,
        dateRangeFrom:
          (queryAndDateRange.dateRange && queryAndDateRange.dateRange.from) ||
          this.state.dateRangeFrom,
        dateRangeTo:
          (queryAndDateRange.dateRange && queryAndDateRange.dateRange.to) || this.state.dateRangeTo,
      },
      () => {
        if (this.props.onQuerySubmit) {
          this.props.onQuerySubmit(
            {
              query: this.state.query,
              dateRange: {
                from: this.state.dateRangeFrom,
                to: this.state.dateRangeTo,
              },
            },
            this.isDirty()
          );
        }
        this.services.usageCollection?.reportUiCounter(
          this.services.appName,
          METRIC_TYPE.CLICK,
          'query_submitted'
        );
      }
    );
  };

  public onLoadSavedQuery = (savedQuery: SavedQuery) => {
    const dateRangeFrom = get(savedQuery, 'attributes.timefilter.from', this.state.dateRangeFrom);
    const dateRangeTo = get(savedQuery, 'attributes.timefilter.to', this.state.dateRangeTo);

    this.setState({
      query: savedQuery.attributes.query,
      dateRangeFrom,
      dateRangeTo,
    });

    if (this.props.onSavedQueryUpdated) {
      this.props.onSavedQueryUpdated(savedQuery);
    }
  };

  private shouldShowDatePickerAsBadge() {
    return this.shouldRenderFilterBar() && !this.props.showQueryInput;
  }

  public render() {
    const { theme, query } = this.props;
    const isESQLQuery = isOfAggregateQueryType(query);
    const isScreenshotMode = this.props.isScreenshotMode === true;
    const styles = searchBarStyles(theme, isESQLQuery);
    const cssStyles = [
      styles.uniSearchBar,
      this.props.displayStyle && styles[this.props.displayStyle],
      isScreenshotMode && styles.hidden,
    ];

    const classes = classNames('uniSearchBar', {
      [`uniSearchBar--hidden`]: isScreenshotMode,
      [`uniSearchBar--${this.props.displayStyle}`]: this.props.displayStyle,
    });

    const timeRangeForSuggestionsOverride = this.props.showDatePicker ? undefined : false;

    const saveAsNewQueryFormComponent = (
      <SaveQueryForm
        savedQueryService={this.savedQueryService}
        onSave={(savedQueryMeta) => this.onSave(savedQueryMeta, true)}
        onClose={() => this.setState({ openQueryBarMenu: false })}
        showFilterOption={this.props.showFilterBar}
        showTimeFilterOption={this.shouldRenderTimeFilterInSavedQueryForm()}
      />
    );

    const saveQueryFormComponent = (
      <SaveQueryForm
        savedQuery={this.props.savedQuery ? this.props.savedQuery : undefined}
        savedQueryService={this.savedQueryService}
        onSave={this.onSave}
        onClose={() => this.setState({ openQueryBarMenu: false })}
        showFilterOption={this.props.showFilterBar}
        showTimeFilterOption={this.shouldRenderTimeFilterInSavedQueryForm()}
      />
    );

    const queryBarMenu = this.props.showQueryMenu ? (
      <QueryBarMenu
        nonKqlMode={this.props.nonKqlMode}
        disableQueryLanguageSwitcher={this.props.disableQueryLanguageSwitcher}
        language={
          this.state.query && isOfQueryType(this.state?.query)
            ? this.state?.query?.language
            : 'kuery'
        }
        onQueryChange={this.onQueryBarChange}
        onQueryBarSubmit={this.onQueryBarSubmit}
        dateRangeFrom={this.state.dateRangeFrom}
        dateRangeTo={this.state.dateRangeTo}
        timeFilter={this.getTimeFilter()}
        savedQueryService={this.savedQueryService}
        saveAsNewQueryFormComponent={saveAsNewQueryFormComponent}
        saveFormComponent={saveQueryFormComponent}
        toggleFilterBarMenuPopover={this.toggleFilterBarMenuPopover}
        openQueryBarMenu={this.state.openQueryBarMenu}
        onFiltersUpdated={this.props.onFiltersUpdated}
        filters={this.props.filters}
        additionalQueryBarMenuItems={this.props.additionalQueryBarMenuItems ?? {}}
        hiddenPanelOptions={this.props.hiddenFilterPanelOptions}
        query={this.state.query as Query}
        savedQuery={this.props.savedQuery}
        onClearSavedQuery={this.props.onClearSavedQuery}
        showQueryInput={this.props.showQueryInput}
        showFilterBar={this.props.showFilterBar}
        showSaveQuery={this.props.showSaveQuery}
        showSavedQueryControls={this.props.showSavedQueryControls}
        isDisabled={this.props.isDisabled}
        buttonProps={{ size: this.shouldShowDatePickerAsBadge() ? 's' : 'm' }}
        indexPatterns={this.props.indexPatterns}
        timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
        filtersForSuggestions={this.props.filtersForSuggestions}
        manageFilterSetComponent={
          this.props.showFilterBar && this.state.query && this.props.onClearSavedQuery
            ? this.renderSavedQueryManagement(
                this.props.onClearSavedQuery,
                this.props.showSaveQuery,
                this.props.savedQuery
              )
            : undefined
        }
        suggestionsAbstraction={this.props.suggestionsAbstraction}
        renderQueryInputAppend={this.props.renderQueryInputAppend}
        queryBarMenuRef={this.queryBarMenuRef}
      />
    ) : undefined;

    let filterBar;
    if (this.shouldRenderFilterBar()) {
      filterBar = this.shouldShowDatePickerAsBadge() ? (
        <FilterItems
          filters={this.props.filters!}
          onFiltersUpdated={this.props.onFiltersUpdated}
          indexPatterns={this.props.indexPatterns!}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          filtersForSuggestions={this.props.filtersForSuggestions}
          hiddenPanelOptions={this.props.hiddenFilterPanelOptions}
          readOnly={this.props.isDisabled}
          suggestionsAbstraction={this.props.suggestionsAbstraction}
        />
      ) : (
        <FilterBar
          afterQueryBar
          filters={this.props.filters!}
          onFiltersUpdated={this.props.onFiltersUpdated}
          indexPatterns={this.props.indexPatterns!}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          filtersForSuggestions={this.props.filtersForSuggestions}
          hiddenPanelOptions={this.props.hiddenFilterPanelOptions}
          isDisabled={this.props.isDisabled}
          data-test-subj="unifiedFilterBar"
          prepend={this.props.prependFilterBar}
          suggestionsAbstraction={this.props.suggestionsAbstraction}
        />
      );
    }

    return (
      <div className={classes} css={cssStyles} data-test-subj="globalQueryBar">
        <QueryBarTopRow<QT>
          timeHistory={this.props.timeHistory}
          query={this.state.query}
          screenTitle={this.props.screenTitle}
          onSubmit={this.onQueryBarSubmit}
          indexPatterns={this.props.indexPatterns}
          isLoading={this.props.isLoading}
          fillSubmitButton={this.props.fillSubmitButton || false}
          prepend={this.props.showFilterBar || this.props.showQueryInput ? queryBarMenu : undefined}
          showDatePicker={this.props.showDatePicker}
          dateRangeFrom={this.state.dateRangeFrom}
          dateRangeTo={this.state.dateRangeTo}
          isRefreshPaused={this.props.isRefreshPaused}
          refreshInterval={this.props.refreshInterval}
          minRefreshInterval={this.props.minRefreshInterval}
          showAutoRefreshOnly={this.props.showAutoRefreshOnly}
          showQueryInput={this.props.showQueryInput}
          showAddFilter={this.props.showFilterBar}
          isDisabled={this.props.isDisabled}
          onRefresh={this.props.onRefresh}
          onRefreshChange={this.props.onRefreshChange}
          onCancel={this.props.onCancel}
          onChange={this.onQueryBarChange}
          isDirty={this.isDirty()}
          customSubmitButton={
            this.props.customSubmitButton ? this.props.customSubmitButton : undefined
          }
          dataViewPickerOverride={this.props.dataViewPickerOverride}
          showSubmitButton={this.props.showSubmitButton}
          submitButtonStyle={this.props.submitButtonStyle}
          dataTestSubj={this.props.dataTestSubj}
          indicateNoData={this.props.indicateNoData}
          placeholder={this.props.placeholder}
          isClearable={this.props.isClearable}
          iconType={this.props.iconType}
          nonKqlMode={this.props.nonKqlMode}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          filtersForSuggestions={this.props.filtersForSuggestions}
          filters={this.props.filters!}
          onFiltersUpdated={this.props.onFiltersUpdated}
          dataViewPickerComponentProps={this.props.dataViewPickerComponentProps}
          textBasedLanguageModeErrors={this.props.textBasedLanguageModeErrors}
          textBasedLanguageModeWarning={this.props.textBasedLanguageModeWarning}
          showDatePickerAsBadge={this.shouldShowDatePickerAsBadge()}
          filterBar={filterBar}
          suggestionsSize={this.props.suggestionsSize}
          isScreenshotMode={this.props.isScreenshotMode}
          onTextLangQuerySubmit={this.onTextLangQuerySubmit}
          onTextLangQueryChange={this.onTextLangQueryChange}
          submitOnBlur={this.props.submitOnBlur}
          suggestionsAbstraction={this.props.suggestionsAbstraction}
          renderQueryInputAppend={this.props.renderQueryInputAppend}
          disableExternalPadding={this.props.displayStyle === 'withBorders'}
          onESQLDocsFlyoutVisibilityChanged={this.props.onESQLDocsFlyoutVisibilityChanged}
        />
      </div>
    );
  }

  private renderSavedQueryManagement = memoizeOne(
    (
      onClearSavedQuery: NonNullable<SearchBarOwnProps['onClearSavedQuery']>,
      showSaveQuery: SearchBarOwnProps['showSaveQuery'],
      savedQuery: SearchBarOwnProps['savedQuery']
    ) => {
      const savedQueryManagement = (
        <SavedQueryManagementList
          showSaveQuery={showSaveQuery}
          loadedSavedQuery={savedQuery}
          savedQueryService={this.savedQueryService}
          queryBarMenuRef={this.queryBarMenuRef}
          onLoad={this.onLoadSavedQuery}
          onClearSavedQuery={onClearSavedQuery}
          onClose={() => this.setState({ openQueryBarMenu: false })}
        />
      );

      return savedQueryManagement;
    }
  );
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default injectI18n(
  withEuiTheme(
    withKibana(
      SearchBarUI as React.ComponentType<
        SearchBarOwnProps<AggregateQuery | Query> & SearchBarInjectedDeps & WithEuiThemeProps<{}>
      >
    )
  )
);
