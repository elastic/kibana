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

// @ts-ignore
import { EuiFilterButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import classNames from 'classnames';
import React, { Component } from 'react';
import ResizeObserver from 'resize-observer-polyfill';
import { Storage } from 'ui/storage';

import { IndexPattern, Query, QueryBar, FilterBar } from '../../../../data/public';

interface DateRange {
  from: string;
  to: string;
}

/**
 * NgReact lib requires that changes to the props need to be made in the directive config as well
 * See [search_bar\directive\index.js] file
 */
export interface SearchBarProps {
  appName: string;
  intl: InjectedIntl;
  indexPatterns?: IndexPattern[];
  // Query bar
  showQueryBar?: boolean;
  showQueryInput?: boolean;
  screenTitle?: string;
  store?: Storage;
  query?: Query;
  onQuerySubmit?: (payload: { dateRange: DateRange; query?: Query }) => void;
  // Filter bar
  showFilterBar?: boolean;
  filters?: Filter[];
  onFiltersUpdated?: (filters: Filter[]) => void;
  // Date picker
  showDatePicker?: boolean;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  // Autorefresh
  isRefreshPaused?: boolean;
  refreshInterval?: number;
  showAutoRefreshOnly?: boolean;
  onRefreshChange?: (options: { isPaused: boolean; refreshInterval: number }) => void;
}

interface State {
  isFiltersVisible: boolean;
}

class SearchBarUI extends Component<SearchBarProps, State> {
  public static defaultProps = {
    showQueryBar: true,
    showFilterBar: true,
    showDatePicker: true,
    showAutoRefreshOnly: false,
  };

  public filterBarRef: Element | null = null;
  public filterBarWrapperRef: Element | null = null;

  public state = {
    isFiltersVisible: true,
  };

  private getFilterLength() {
    if (this.props.showFilterBar && this.props.filters) {
      return this.props.filters.length;
    }
  }

  private getFilterUpdateFunction() {
    if (this.props.showFilterBar && this.props.onFiltersUpdated) {
      return this.props.onFiltersUpdated;
    }
    return (filters: Filter[]) => {};
  }

  private shouldRenderQueryBar() {
    const showDatePicker = this.props.showDatePicker || this.props.showAutoRefreshOnly;
    const showQueryInput =
      this.props.showQueryInput && this.props.indexPatterns && this.props.query;
    return this.props.showQueryBar && (showDatePicker || showQueryInput);
  }

  private shouldRenderFilterBar() {
    return this.props.showFilterBar && this.props.filters && this.props.indexPatterns;
  }

  public setFilterBarHeight = () => {
    requestAnimationFrame(() => {
      const height =
        this.filterBarRef && this.state.isFiltersVisible ? this.filterBarRef.clientHeight : 0;
      if (this.filterBarWrapperRef) {
        this.filterBarWrapperRef.setAttribute('style', `height: ${height}px`);
      }
    });
  };

  // member-ordering rules conflict with use-before-declaration rules
  /* eslint-disable */
  public ro = new ResizeObserver(this.setFilterBarHeight);
  /* eslint-enable */

  public toggleFiltersVisible = () => {
    this.setState({
      isFiltersVisible: !this.state.isFiltersVisible,
    });
  };

  public componentDidMount() {
    if (this.filterBarRef) {
      this.setFilterBarHeight();
      this.ro.observe(this.filterBarRef);
    }
  }

  public componentDidUpdate() {
    if (this.filterBarRef) {
      this.setFilterBarHeight();
      this.ro.unobserve(this.filterBarRef);
    }
  }

  public render() {
    const filtersAppliedText = this.props.intl.formatMessage({
      id: 'kibana_react.search.searchBar.filtersButtonFiltersAppliedTitle',
      defaultMessage: 'filters applied.',
    });
    const clickToShowOrHideText = this.state.isFiltersVisible
      ? this.props.intl.formatMessage({
          id: 'kibana_react.search.searchBar.filtersButtonClickToShowTitle',
          defaultMessage: 'Select to hide',
        })
      : this.props.intl.formatMessage({
          id: 'kibana_react.search.searchBar.filtersButtonClickToHideTitle',
          defaultMessage: 'Select to show',
        });

    const filterTriggerButton = (
      <EuiFilterButton
        onClick={this.toggleFiltersVisible}
        isSelected={this.state.isFiltersVisible}
        hasActiveFilters={this.state.isFiltersVisible}
        numFilters={this.getFilterLength() ? this.getFilterLength() : undefined}
        aria-controls="GlobalFilterGroup"
        aria-expanded={!!this.state.isFiltersVisible}
        title={`${this.getFilterLength()} ${filtersAppliedText} ${clickToShowOrHideText}`}
      >
        Filters
      </EuiFilterButton>
    );

    const classes = classNames('globalFilterGroup__wrapper', {
      'globalFilterGroup__wrapper-isVisible': this.state.isFiltersVisible,
    });

    let queryBar;
    if (this.shouldRenderQueryBar()) {
      queryBar = (
        <QueryBar
          query={this.props.query}
          screenTitle={this.props.screenTitle}
          onSubmit={this.props.onQuerySubmit!}
          appName={this.props.appName}
          indexPatterns={this.props.indexPatterns}
          store={this.props.store!}
          prepend={this.props.showFilterBar ? filterTriggerButton : ''}
          showDatePicker={this.props.showDatePicker}
          showQueryInput={this.props.showQueryInput}
          dateRangeFrom={this.props.dateRangeFrom}
          dateRangeTo={this.props.dateRangeTo}
          isRefreshPaused={this.props.isRefreshPaused}
          refreshInterval={this.props.refreshInterval}
          showAutoRefreshOnly={this.props.showAutoRefreshOnly}
          onRefreshChange={this.props.onRefreshChange}
        />
      );
    }

    let filterBar;
    if (this.shouldRenderFilterBar()) {
      filterBar = (
        <div
          id="GlobalFilterGroup"
          ref={node => {
            this.filterBarWrapperRef = node;
          }}
          className={classes}
        >
          <div
            ref={node => {
              this.filterBarRef = node;
            }}
          >
            <FilterBar
              className="globalFilterGroup__filterBar"
              filters={this.props.filters!}
              onFiltersUpdated={this.getFilterUpdateFunction()}
              indexPatterns={this.props.indexPatterns!}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="globalQueryBar">
        {queryBar}
        {filterBar}
      </div>
    );
  }
}

export const SearchBar = injectI18n(SearchBarUI);
