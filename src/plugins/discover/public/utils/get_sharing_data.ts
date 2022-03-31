/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Capabilities } from 'kibana/public';
import type { IUiSettingsClient } from 'kibana/public';
import type {
  DataPublicPluginStart,
  ISearchSource,
  SerializedSearchSourceFields,
} from 'src/plugins/data/public';
import type { Filter } from '@kbn/es-query';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
  SORT_DEFAULT_ORDER_SETTING,
} from '../../common';
import type { SavedSearch, SortOrder } from '../services/saved_searches';
import { getSortForSearchSource } from '../components/doc_table';
import { AppState, isEqualFilters } from '../application/main/services/discover_state';

/**
 * Preparing data to share the current state as link or CSV/Report
 */
export async function getSharingData(
  currentSearchSource: ISearchSource,
  state: AppState | SavedSearch,
  services: { uiSettings: IUiSettingsClient; data: DataPublicPluginStart }
) {
  const { uiSettings: config, data } = services;
  const searchSource = currentSearchSource.createCopy();
  const index = searchSource.getField('index')!;
  let existingFilter = searchSource.getField('filter') as Filter[] | Filter | undefined;

  searchSource.setField(
    'sort',
    getSortForSearchSource(state.sort as SortOrder[], index, config.get(SORT_DEFAULT_ORDER_SETTING))
  );

  searchSource.removeField('filter');
  searchSource.removeField('highlight');
  searchSource.removeField('highlightAll');
  searchSource.removeField('aggs');
  searchSource.removeField('size');

  // Columns that the user has selected in the saved search
  let columns = state.columns || [];

  if (columns && columns.length > 0) {
    // conditionally add the time field column:
    let timeFieldName: string | undefined;
    const hideTimeColumn = config.get(DOC_HIDE_TIME_COLUMN_SETTING);
    if (!hideTimeColumn && index && index.timeFieldName) {
      timeFieldName = index.timeFieldName;
    }
    if (timeFieldName && !columns.includes(timeFieldName)) {
      columns = [timeFieldName, ...columns];
    }
  }

  const absoluteTimeFilter = data.query.timefilter.timefilter.createFilter(index);
  const relativeTimeFilter = data.query.timefilter.timefilter.createRelativeFilter(index);
  return {
    getSearchSource: (absoluteTime?: boolean): SerializedSearchSourceFields => {
      const timeFilter = absoluteTime ? absoluteTimeFilter : relativeTimeFilter;

      // remove timeFilter from existing filter
      if (Array.isArray(existingFilter)) {
        existingFilter = existingFilter.filter(
          (current) => !isEqualFilters(current, absoluteTimeFilter)
        );
      } else if (isEqualFilters(existingFilter, absoluteTimeFilter)) {
        existingFilter = undefined;
      }

      if (existingFilter && timeFilter) {
        searchSource.setField(
          'filter',
          Array.isArray(existingFilter)
            ? [timeFilter, ...existingFilter]
            : ([timeFilter, existingFilter] as Filter[])
        );
      } else {
        const filter = timeFilter || existingFilter;
        searchSource.setField('filter', filter);
      }

      /*
       * For downstream querying performance, the searchSource object must have fields set.
       * Otherwise, the requests will ask for all fields, even if only a few are really needed.
       * Discover does not set fields, since having all fields is needed for the UI.
       */
      const useFieldsApi = !config.get(SEARCH_FIELDS_FROM_SOURCE);
      if (useFieldsApi && columns.length) {
        searchSource.setField('fields', columns);
      }
      return searchSource.getSerializedFields(true);
    },
    columns,
  };
}

export interface DiscoverCapabilities {
  createShortUrl?: boolean;
  save?: boolean;
  saveQuery?: boolean;
  show?: boolean;
  storeSearchSession?: boolean;
}

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.discover) return false;

  const discover = anonymousUserCapabilities.discover as unknown as DiscoverCapabilities;

  return !!discover.show;
};
