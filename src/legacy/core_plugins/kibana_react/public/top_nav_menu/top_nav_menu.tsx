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
import { UiSettingsClientContract, SavedObjectsClientContract } from 'src/core/public';
import { TopNavMenuData } from './top_nav_menu_data';
import { TopNavMenuItem } from './top_nav_menu_item';
import {
  SearchBar,
  SearchBarProps,
  TimeHistoryContract,
} from '../../../../core_plugins/data/public';

type Props = Partial<SearchBarProps> & {
  name: string;
  uiSettings: UiSettingsClientContract;
  savedObjectsClient: SavedObjectsClientContract;
  timeHistory: TimeHistoryContract;
  config?: TopNavMenuData[];
  showSearchBar?: boolean;
};

/*
 * Top Nav Menu is a convenience wrapper component for:
 * - Top navigation menu - configured by an array of `TopNavMenuData` objects
 * - Search Bar - which includes Filter Bar \ Query Input \ Timepicker.
 *
 * See SearchBar documentation to learn more about its properties.
 *
 **/

export function TopNavMenu(props: Props) {
  function renderItems() {
    if (!props.config) return;
    return props.config.map((menuItem: TopNavMenuData, i: number) => {
      return (
        <EuiFlexItem grow={false} key={`nav-menu-${i}`}>
          <TopNavMenuItem {...menuItem} />
        </EuiFlexItem>
      );
    });
  }

  function renderSearchBar() {
    // Validate presense of all required fields
    if (!props.showSearchBar || !props.savedObjectsClient || !props.timeHistory || !props.http) return;
    return (
      <SearchBar
        timeHistory={props.timeHistory}
        savedObjectsClient={props.savedObjectsClient}
        http={props.http}
        query={props.query}
        filters={props.filters}
        uiSettings={props.uiSettings}
        showQueryBar={props.showQueryBar}
        showQueryInput={props.showQueryInput}
        showFilterBar={props.showFilterBar}
        showDatePicker={props.showDatePicker}
        appName={props.appName!}
        screenTitle={props.screenTitle!}
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
        savedQuery={props.savedQuery}
        showSaveQuery={props.showSaveQuery}
        onClearSavedQuery={props.onClearSavedQuery}
        onSaved={props.onSaved}
        onSavedQueryUpdated={props.onSavedQueryUpdated}
      />
    );
  }

  function renderLayout() {
    return (
      <span className="kbnTopNavMenu__wrapper">
        <EuiFlexGroup
          data-test-subj="top-nav"
          justifyContent="flexStart"
          gutterSize="none"
          className="kbnTopNavMenu"
          responsive={false}
        >
          {renderItems()}
        </EuiFlexGroup>
        {renderSearchBar()}
      </span>
    );
  }

  return <I18nProvider>{renderLayout()}</I18nProvider>;
}

TopNavMenu.defaultProps = {
  showSearchBar: false,
  showQueryBar: true,
  showQueryInput: true,
  showDatePicker: true,
  showFilterBar: true,
  screenTitle: '',
};
