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

import React, { FunctionComponent, useState, useEffect } from 'react';
import { SavedQuery } from '@kbn/es-query/src/filters/lib/saved_query_filter';
import { UiSettingsClientContract } from 'kibana/public';
import { TimeHistoryContract } from 'ui/timefilter';
import { Filter } from '@kbn/es-query';
import { TimeRange } from 'src/plugins/data/common/types';
import { IndexPattern, Query } from '../../..';
import { SearchBar } from '../../../search/search_bar/components/search_bar';
import { FilterManager } from '../../filter_manager';

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
  const [currentFilters, setCurrentFilters] = useState([] as Filter[]);
  const [currentQuery, setCurrentQuery] = useState({
    query: '',
    language: uiSettings.get('search:queryLanguage'),
  } as Query);
  const [currentDateRange, setCurrentDateRange] = useState({ to: '', from: '' });
  const [savedQuery, setSavedQuery] = useState(currentSavedQuery);

  const filterManager = new FilterManager(uiSettings);
  filterManager.addFilters(currentFilters);

  useEffect(() => {
    // extract the query, filters and timerange from the saved query we get as a prop
    filterManager.addFilters(currentFilters);
  }, [currentFilters]);

  const onClearSavedQuery = () => {
    setCurrentFilters([]);
    setCurrentQuery({ query: '', language: uiSettings.get('search:queryLanguage') });
    setCurrentDateRange({ to: '', from: '' });
    setSavedQuery(undefined);
  };
  const onQueryChange = (queryAndDateRange: { dateRange?: TimeRange; query?: Query }) => {
    const newQuery = queryAndDateRange.query ? queryAndDateRange.query : currentQuery;
    const newDateRange = queryAndDateRange.dateRange
      ? queryAndDateRange.dateRange
      : currentDateRange;
    if (newQuery) setCurrentQuery(newQuery);
    if (newDateRange) setCurrentDateRange(newDateRange);

    return queryAndDateRange;
  };
  const onFiltersUpdated = (filters: Filter[]) => {
    setCurrentFilters(filters);
    filterManager.addFilters(currentFilters);
  };

  const updateSavedQuery = (updatedSavedQuery: SavedQuery) => {
    const savedQuerySearchData = {
      filters: updatedSavedQuery.attributes.filters
        ? updatedSavedQuery.attributes.filters
        : undefined,
      query: updatedSavedQuery.attributes.query,
      dateRange: updatedSavedQuery.attributes.timefilter
        ? {
            to: updatedSavedQuery.attributes.timefilter.to,
            from: updatedSavedQuery.attributes.timefilter.from,
          }
        : undefined,
    };
    // update the filters
    if (savedQuerySearchData.filters) {
      onFiltersUpdated(savedQuerySearchData.filters);
    }
    // update the query and timefilter
    onQueryChange({ dateRange: savedQuerySearchData.dateRange, query: savedQuerySearchData.query });
    setSavedQuery(updatedSavedQuery);
    onSelectionChange([updatedSavedQuery]); // a shortcut to activate the button to save the filter
  };
  return (
    <div className="savedQueryFilterEditor">
      <SearchBar
        indexPatterns={indexPatterns}
        showFilterBar={true}
        filters={filterManager.getFilters()}
        onFiltersUpdated={onFiltersUpdated}
        showQueryInput={true}
        query={currentQuery}
        onQuerySubmit={onQueryChange}
        showSaveQuery={showSaveQuery}
        savedQuery={savedQuery}
        onClearSavedQuery={onClearSavedQuery}
        onSavedQueryUpdated={updateSavedQuery}
        showDatePicker={true}
        timeHistory={timeHistory!}
        customSubmitButton={<></>}
      />
    </div>
  );
};
