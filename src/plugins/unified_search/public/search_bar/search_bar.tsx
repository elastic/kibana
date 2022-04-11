/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { compact } from 'lodash';
import { InjectedIntl, injectI18n } from '@kbn/i18n-react';
import classNames from 'classnames';
import React, { Component } from 'react';
import { get, isEqual } from 'lodash';
import { EuiIconProps } from '@elastic/eui';
import memoizeOne from 'memoize-one';

import { METRIC_TYPE } from '@kbn/analytics';
import { Query, Filter } from '@kbn/es-query';
import { withKibana, KibanaReactContextValue } from '../../../kibana_react/public';

import QueryBarTopRow from '../query_string_input/query_bar_top_row';
import type { TimeHistoryContract, SavedQuery } from '../../../data/public';
import type { SavedQueryAttributes } from '../../../data/common';
import { IDataPluginServices } from '../../../data/public';
import { FilterBar } from '../filter_bar';
import { TimeRange, IIndexPattern } from '../../../data/common';
import { SavedQueryMeta, SaveQueryForm } from '../saved_query_form';
import { SavedQueryManagementList } from '../saved_query_management';
import { QueryBarMenu } from '../query_string_input/query_bar_menu';
import type { DataViewPickerProps } from '../dataview_picker';

export interface SearchBarInjectedDeps {
  kibana: KibanaReactContextValue<IDataPluginServices>;
  intl: InjectedIntl;
  timeHistory: TimeHistoryContract;
  // Filter bar
  onFiltersUpdated?: (filters: Filter[]) => void;
  // Autorefresh
  onRefreshChange?: (options: { isPaused: boolean; refreshInterval: number }) => void;
}

export interface SearchBarOwnProps {
  indexPatterns?: IIndexPattern[];
  isLoading?: boolean;
  customSubmitButton?: React.ReactNode;
  screenTitle?: string;
  dataTestSubj?: string;
  // Togglers
  showQueryBar?: boolean;
  showQueryInput?: boolean;
  showFilterBar?: boolean;
  showDatePicker?: boolean;
  showAutoRefreshOnly?: boolean;
  filters?: Filter[];
  // Date picker
  isRefreshPaused?: boolean;
  refreshInterval?: number;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  // Query bar - should be in SearchBarInjectedDeps
  query?: Query;
  // Show when user has privileges to save
  showSaveQuery?: boolean;
  savedQuery?: SavedQuery;
  onQueryChange?: (payload: { dateRange: TimeRange; query?: Query }) => void;
  onQuerySubmit?: (payload: { dateRange: TimeRange; query?: Query }, isUpdate?: boolean) => void;
  // User has saved the current state as a saved query
  onSaved?: (savedQuery: SavedQuery) => void;
  // User has modified the saved query, your app should persist the update
  onSavedQueryUpdated?: (savedQuery: SavedQuery) => void;
  // User has cleared the active query, your app should clear the entire query bar
  onClearSavedQuery?: () => void;

  onRefresh?: (payload: { dateRange: TimeRange }) => void;
  indicateNoData?: boolean;

  placeholder?: string;
  isClearable?: boolean;
  iconType?: EuiIconProps['type'];
  nonKqlMode?: 'lucene' | 'text';
  // defines padding; use 'inPage' to avoid extra padding;
  // use 'detached' if the searchBar appears at the very top of the view, without any wrapper
  displayStyle?: 'inPage' | 'detached';
  // super update button background fill control
  fillSubmitButton?: boolean;
  dataViewPickerComponentProps?: DataViewPickerProps;
}

export type SearchBarProps = SearchBarOwnProps & SearchBarInjectedDeps;

interface State {
  isFiltersVisible: boolean;
  openQueryBarMenu: boolean;
  showSavedQueryPopover: boolean;
  currentProps?: SearchBarProps;
  query?: Query;
  dateRangeFrom: string;
  dateRangeTo: string;
}

class SearchBarUI extends Component<SearchBarProps, State> {
  public static defaultProps = {
    showQueryBar: true,
    showFilterBar: true,
    showDatePicker: true,
    showAutoRefreshOnly: false,
  };

  private services = this.props.kibana.services;
  private savedQueryService = this.services.data.query.savedQueries;

  public static getDerivedStateFromProps(nextProps: SearchBarProps, prevState: State) {
    if (isEqual(prevState.currentProps, nextProps)) {
      return null;
    }

    let nextQuery = null;
    if (nextProps.query && nextProps.query.query !== get(prevState, 'currentProps.query.query')) {
      nextQuery = {
        query: nextProps.query.query,
        language: nextProps.query.language,
      };
    } else if (
      nextProps.query &&
      prevState.query &&
      nextProps.query.language !== prevState.query.language
    ) {
      nextQuery = {
        query: '',
        language: nextProps.query.language,
      };
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
  };

  public isDirty = () => {
    if (!this.props.showDatePicker && this.state.query && this.props.query) {
      return this.state.query.query !== this.props.query.query;
    }

    return (
      (this.state.query && this.props.query && this.state.query.query !== this.props.query.query) ||
      this.state.dateRangeFrom !== this.props.dateRangeFrom ||
      this.state.dateRangeTo !== this.props.dateRangeTo
    );
  };

  componentWillUnmount() {
    this.renderSavedQueryManagement.clear();
  }

  private shouldRenderQueryBar() {
    const showDatePicker = this.props.showDatePicker || this.props.showAutoRefreshOnly;
    const showQueryInput =
      this.props.showQueryInput && this.props.indexPatterns && this.state.query;
    return (
      this.props.showQueryBar && (showDatePicker || showQueryInput || this.props.showFilterBar)
    );
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
    const { dateRangeFrom, dateRangeTo, showDatePicker } = this.props;
    return (
      showDatePicker ||
      (!showDatePicker && dateRangeFrom !== undefined && dateRangeTo !== undefined)
    );
  }

  public onSave = async (savedQueryMeta: SavedQueryMeta, saveAsNew = false) => {
    if (!this.state.query) return;

    const savedQueryAttributes: SavedQueryAttributes = {
      title: savedQueryMeta.title,
      description: savedQueryMeta.description,
      query: this.state.query,
    };

    if (savedQueryMeta.shouldIncludeFilters) {
      savedQueryAttributes.filters = this.props.filters;
    }

    if (
      savedQueryMeta.shouldIncludeTimefilter &&
      this.state.dateRangeTo !== undefined &&
      this.state.dateRangeFrom !== undefined &&
      this.props.refreshInterval !== undefined &&
      this.props.isRefreshPaused !== undefined
    ) {
      savedQueryAttributes.timefilter = {
        from: this.state.dateRangeFrom,
        to: this.state.dateRangeTo,
        refreshInterval: {
          value: this.props.refreshInterval,
          pause: this.props.isRefreshPaused,
        },
      };
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
        `Your query "${response.attributes.title}" was saved`
      );

      if (this.props.onSaved) {
        this.props.onSaved(response);
      }
    } catch (error) {
      this.services.notifications.toasts.addDanger(
        `An error occured while saving your query: ${error.message}`
      );
      throw error;
    }
  };

  public onQueryBarChange = (queryAndDateRange: { dateRange: TimeRange; query?: Query }) => {
    this.setState({
      query: queryAndDateRange.query,
      dateRangeFrom: queryAndDateRange.dateRange.from,
      dateRangeTo: queryAndDateRange.dateRange.to,
    });
    if (this.props.onQueryChange) {
      this.props.onQueryChange(queryAndDateRange);
    }
  };

  public toggleFilterBarMenuPopover = (value: boolean) => {
    this.setState({
      openQueryBarMenu: value,
    });
  };

  public onQueryBarSubmit = (queryAndDateRange: { dateRange?: TimeRange; query?: Query }) => {
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
          this.props.onQuerySubmit({
            query: this.state.query,
            dateRange: {
              from: this.state.dateRangeFrom,
              to: this.state.dateRangeTo,
            },
          });
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

    const queryBarMenu = (
      <QueryBarMenu
        nonKqlMode={this.props.nonKqlMode}
        language={this.state?.query?.language ?? 'kuery'}
        onQueryChange={this.onQueryBarChange}
        onQueryBarSubmit={this.onQueryBarSubmit}
        dateRangeFrom={this.state.dateRangeFrom}
        dateRangeTo={this.state.dateRangeTo}
        savedQueryService={this.savedQueryService}
        saveAsNewQueryFormComponent={saveAsNewQueryFormComponent}
        saveFormComponent={saveQueryFormComponent}
        toggleFilterBarMenuPopover={this.toggleFilterBarMenuPopover}
        openQueryBarMenu={this.state.openQueryBarMenu}
        onFiltersUpdated={this.props.onFiltersUpdated}
        filters={this.props.filters}
        query={this.state.query}
        savedQuery={this.props.savedQuery}
        onClearSavedQuery={this.props.onClearSavedQuery}
        showQueryInput={this.props.showQueryInput}
        showFilterBar={this.props.showFilterBar}
        showSaveQuery={this.props.showSaveQuery}
        buttonProps={{ size: this.shouldShowDatePickerAsBadge() ? 's' : 'm' }}
        indexPatterns={this.props.indexPatterns}
        timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
        manageFilterSetComponent={
          this.props.showFilterBar && this.state.query
            ? this.renderSavedQueryManagement(
                this.props.onClearSavedQuery,
                this.props.showSaveQuery,
                this.props.savedQuery
              )
            : undefined
        }
      />
    );

    let filterBar;
    if (this.shouldRenderFilterBar()) {
      const filterGroupClasses = classNames('globalFilterGroup__wrapper', {
        'globalFilterGroup__wrapper-isVisible': this.state.isFiltersVisible,
      });

      filterBar = (
        <div id="globalFilterGroup" className={filterGroupClasses}>
          <FilterBar
            className="globalFilterGroup__filterBar"
            filters={this.props.filters!}
            onFiltersUpdated={this.props.onFiltersUpdated}
            indexPatterns={this.props.indexPatterns!}
            appName={this.services.appName}
            timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          />
        </div>
      );
    }

    let queryBar;
    if (this.shouldRenderQueryBar()) {
      queryBar = (
        <QueryBarTopRow
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
          showAutoRefreshOnly={this.props.showAutoRefreshOnly}
          showQueryInput={this.props.showQueryInput}
          showAddFilter={this.props.showFilterBar}
          onRefresh={this.props.onRefresh}
          onRefreshChange={this.props.onRefreshChange}
          onChange={this.onQueryBarChange}
          isDirty={this.isDirty()}
          customSubmitButton={
            this.props.customSubmitButton ? this.props.customSubmitButton : undefined
          }
          dataTestSubj={this.props.dataTestSubj}
          indicateNoData={this.props.indicateNoData}
          placeholder={this.props.placeholder}
          isClearable={this.props.isClearable}
          iconType={this.props.iconType}
          nonKqlMode={this.props.nonKqlMode}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          filters={this.props.filters!}
          onFiltersUpdated={this.props.onFiltersUpdated}
          dataViewPickerComponentProps={this.props.dataViewPickerComponentProps}
          filterBar={this.shouldShowDatePickerAsBadge() ? filterBar : undefined}
        />
      );
    }

    const globalQueryBarClasses = classNames('globalQueryBar', {
      'globalQueryBar--inPage': this.props.displayStyle === 'inPage',
    });

    return (
      <div className={globalQueryBarClasses} data-test-subj="globalQueryBar">
        {queryBar}
        {!this.shouldShowDatePickerAsBadge() && filterBar}
      </div>
    );
  }

  private hasFiltersOrQuery() {
    const hasFilters = Boolean(this.props.filters && this.props.filters.length > 0);
    const hasQuery = Boolean(this.state.query && this.state.query.query);
    return hasFilters || hasQuery;
  }

  private renderSavedQueryManagement = memoizeOne(
    (
      onClearSavedQuery: SearchBarOwnProps['onClearSavedQuery'],
      showSaveQuery: SearchBarOwnProps['showSaveQuery'],
      savedQuery: SearchBarOwnProps['savedQuery']
    ) => {
      const savedQueryManagement = onClearSavedQuery && (
        <SavedQueryManagementList
          showSaveQuery={showSaveQuery}
          loadedSavedQuery={savedQuery}
          onLoad={this.onLoadSavedQuery}
          savedQueryService={this.savedQueryService}
          onClearSavedQuery={onClearSavedQuery}
          onClose={() => this.setState({ openQueryBarMenu: false })}
          hasFiltersOrQuery={this.hasFiltersOrQuery()}
        />
      );

      return savedQueryManagement;
    }
  );
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default injectI18n(withKibana(SearchBarUI));
