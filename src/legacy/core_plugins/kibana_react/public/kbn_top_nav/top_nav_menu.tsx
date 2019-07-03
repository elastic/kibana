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

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n/react';
import { Storage } from 'ui/storage';
import { TopNavMenuData, TopNavMenuAction } from './top_nav_menu_data';
import { TopNavMenuItem } from './top_nav_menu_item';
import { SearchBar, SearchBarProps } from '../../../../core_plugins/data/public';

const localStorage = new Storage(window.localStorage);

interface Props extends SearchBarProps {
  config: TopNavMenuData[];
  name: string;
  showBorder?: boolean;
  activeItem: string;
  showSearchBar: boolean;
}

export function TopNavMenu(props: Props) {
  function renderItems() {
    return props.config.map((menuItem, i) => (
      <EuiFlexItem grow={false} key={i}>
        <TopNavMenuItem data={menuItem} onClick={menuItemClickHandler} />
      </EuiFlexItem>
    ));
  }

  function getBorder() {
    if (!props.showBorder) return;
    return <EuiHorizontalRule margin="none" />;
  }

  function menuItemClickHandler(key: string, action: TopNavMenuAction, target?: any) {
    action(null, null, target);
  }

  function getSearchBar() {
    if (!props.showSearchBar) return;
    return (
      <SearchBar
        query={props.query}
        filters={props.filters}
        showQueryBar={props.showQueryBar}
        appName={props.appName}
        screenTitle={props.screenTitle}
        onQuerySubmit={props.onQuerySubmit}
        onFiltersUpdated={props.onFiltersUpdated}
        showFilterBar={props.showFilterBar}
        dateRangeFrom={props.dateRangeFrom}
        dateRangeTo={props.dateRangeTo}
        showDatePicker={props.showDatePicker}
        isRefreshPaused={props.isRefreshPaused}
        refreshInterval={props.refreshInterval}
        indexPatterns={props.indexPatterns}
        store={localStorage}
      />
    );
  }

  return (
    <I18nProvider>
      <div>
        <EuiFlexGroup data-test-subj="top-nav" justifyContent="flexStart" gutterSize="xs">
          {renderItems()}
        </EuiFlexGroup>
        {getBorder()}
        {getSearchBar()}
      </div>
    </I18nProvider>
  );
}
