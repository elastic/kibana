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

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n/react';
import { TopNavMenuData, TopNavMenuAction } from './top_nav_menu_data';
import { TopNavMenuItem } from './top_nav_menu_item';
import { SearchBar, SearchBarProps } from '../../../../core_plugins/data/public';

type Props = Partial<SearchBarProps> & {
  name: string;
  config?: TopNavMenuData[];
  showSearchBar?: boolean;
  showSearchBarInline?: boolean;
};

export function TopNavMenu(props: Props) {
  function renderItems() {
    if (!props.config) return;
    return props.config.map((menuItem, i) => (
      <EuiFlexItem grow={false} key={i}>
        <TopNavMenuItem data={menuItem} onClick={menuItemClickHandler} />
      </EuiFlexItem>
    ));
  }

  function menuItemClickHandler(key: string, action: TopNavMenuAction, target?: any) {
    action(null, null, target);
  }

  function renderSearchBar() {
    // Validate presense of all required fields
    if (
      !props.showSearchBar ||
      !props.appName ||
      !props.query ||
      !props.screenTitle ||
      !props.onQuerySubmit ||
      !props.indexPatterns ||
      !props.store
    ) {
      return;
    }

    return (
      <SearchBar
        query={props.query}
        filters={props.filters}
        showQueryBar={props.showQueryBar}
        showQueryInput={props.showQueryInput}
        showFilterBar={props.showFilterBar}
        showDatePicker={props.showDatePicker}
        appName={props.appName}
        screenTitle={props.screenTitle}
        onQuerySubmit={props.onQuerySubmit}
        onFiltersUpdated={props.onFiltersUpdated}
        dateRangeFrom={props.dateRangeFrom}
        dateRangeTo={props.dateRangeTo}
        isRefreshPaused={props.isRefreshPaused}
        showAutoRefreshOnly={props.showAutoRefreshOnly}
        onRefreshChange={props.onRefreshChange}
        refreshInterval={props.refreshInterval}
        indexPatterns={props.indexPatterns}
        store={props.store}
      />
    );
  }

  function renderLayout() {
    if (props.showSearchBarInline) {
      return (
        <div>
          <EuiFlexGroup
            data-test-subj="top-nav"
            justifyContent="spaceBetween"
            gutterSize="none"
            wrap={true}
            className="topNavMenu"
          >
            <EuiFlexGroup justifyContent="flexStart" gutterSize="xs">
              {renderItems()}
            </EuiFlexGroup>
            <EuiFlexItem grow={false}>{renderSearchBar()}</EuiFlexItem>
          </EuiFlexGroup>
        </div>
      );
    } else {
      return (
        <span>
          <EuiFlexGroup
            data-test-subj="top-nav"
            justifyContent="flexStart"
            gutterSize="s"
            className="topNavMenu"
          >
            {renderItems()}
          </EuiFlexGroup>
          {renderSearchBar()}
        </span>
      );
    }
  }

  return <I18nProvider>{renderLayout()}</I18nProvider>;
}

TopNavMenu.defaultProps = {
  showSearchBar: false,
  showQueryBarInline: false,
  showQueryBar: true,
  showQueryInput: true,
  showDatePicker: true,
  showFilterBar: true,
  screenTitle: '',
};
