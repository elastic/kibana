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

import React, { FunctionComponent, useState } from 'react';
import { SavedQuery } from '@kbn/es-query/src/filters/lib/saved_query_filter';
import { UiSettingsClientContract } from 'kibana/public';
import { TimeHistoryContract } from 'ui/timefilter';
import { Filter } from '@kbn/es-query';
import { TimeRange } from 'src/plugins/data/common/types';
import { IndexPattern, Query } from '../../..';
import { SearchBar } from '../../../search/search_bar/components/search_bar';

interface Props {
  uiSettings: UiSettingsClientContract;
  currentSavedQuery?: SavedQuery;
  indexPatterns: IndexPattern[];
  showSaveQuery: boolean;
  timeHistory?: TimeHistoryContract; // I need some other way of accessing timeHistory rather than passing it down all the way from the search bar
  onSelectionChange: (selectedSavedQuery: SavedQuery[]) => void;
  onChange: (item: any) => void;
}
export const SearchBarEditor: FunctionComponent<Props> = ({
  uiSettings,
  currentSavedQuery,
  indexPatterns,
  showSaveQuery,
  timeHistory,
  onSelectionChange,
  onChange,
}) => {
  const [currentfilters, setFilters] = useState([] as Filter[]); // change this if it ends up working to use the filters from the saved query passed in (the filter params)
  const [savedQuery, setSavedQuery] = useState(currentSavedQuery);
  const onClearSavedQuery = () => {
    // console.log('saved query cleared');
  };
  const onQueryChange = (queryAndDateRange: { dateRange?: TimeRange; query?: Query }) => {
    // console.log('query changed with queryAndDateRange:', queryAndDateRange);
    return queryAndDateRange;
  };
  const onFiltersUpdated = (filters: Filter[]) => {
    console.log('filters:', filters);
    // adding a new normal filter is not creating the filter first. Are we missing the filter manager?
    setFilters(filters);
  };

  const updateSavedQuery = (item: SavedQuery) => {
    console.log('item in updateSavedQuery:', item);
    const savedQuerySearchData = {
      filters: item.attributes.filters ? item.attributes.filters : undefined,
      query: item.attributes.query,
      dateRange: item.attributes.timefilter
        ? { to: item.attributes.timefilter.to, from: item.attributes.timefilter.from }
        : undefined,
    };
    if (savedQuerySearchData.filters) {
      onFiltersUpdated(savedQuerySearchData.filters);
    }
    onQueryChange({ dateRange: savedQuerySearchData.dateRange, query: savedQuerySearchData.query });
    setSavedQuery(item);
    onSelectionChange([item]); // a shortcut to activate the button to save the filter
  };
  return (
    <div className="savedQueryFilterEditor">
      <SearchBar
        indexPatterns={indexPatterns}
        showFilterBar={true}
        filters={currentfilters}
        onFiltersUpdated={onFiltersUpdated}
        showQueryInput={true}
        query={
          currentSavedQuery && currentSavedQuery.length > 0
            ? {
                language: currentSavedQuery[0].attributes.query.language,
                query: currentSavedQuery[0].attributes.query.query,
              }
            : { language: uiSettings.get('search:queryLanguage'), query: '' }
        }
        onQuerySubmit={onQueryChange}
        showSaveQuery={showSaveQuery}
        savedQuery={
          currentSavedQuery && currentSavedQuery.length > 0 ? currentSavedQuery[0] : undefined
        }
        onClearSavedQuery={onClearSavedQuery}
        onSavedQueryUpdated={updateSavedQuery}
        showDatePicker={true}
        timeHistory={timeHistory!}
        customSubmitButton={<></>}
      />
    </div>
  );
};
