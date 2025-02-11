/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Capabilities } from '@kbn/core/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import type {
  DataPublicPluginStart,
  ISearchSource,
  SerializedSearchSourceFields,
} from '@kbn/data-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  isNestedFieldParent,
  SORT_DEFAULT_ORDER_SETTING,
} from '@kbn/discover-utils';
import {
  DiscoverAppState,
  isEqualFilters,
} from '../application/main/state_management/discover_app_state_container';
import { getSortForSearchSource } from './sorting';

/**
 * Preparing data to share the current state as link or CSV/Report
 */
export async function getSharingData(
  currentSearchSource: ISearchSource,
  state: DiscoverAppState | SavedSearch,
  services: { uiSettings: IUiSettingsClient; data: DataPublicPluginStart },
  isEsqlMode?: boolean
) {
  const { uiSettings, data } = services;
  const searchSource = currentSearchSource.createCopy();
  const index = searchSource.getField('index')!;

  searchSource.setField(
    'sort',
    getSortForSearchSource({
      sort: state.sort as SortOrder[],
      dataView: index,
      defaultSortDir: uiSettings.get(SORT_DEFAULT_ORDER_SETTING),
    })
  );

  searchSource.removeField('highlight');
  searchSource.removeField('highlightAll');
  searchSource.removeField('aggs');
  searchSource.removeField('size');

  // Columns that the user has selected in the saved search
  let columns = state.columns || [];

  if (columns && columns.length > 0) {
    // conditionally add the time field column:
    let timeFieldName: string | undefined;
    const hideTimeColumn = uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING);
    if (!hideTimeColumn && index && index.timeFieldName && !isEsqlMode) {
      timeFieldName = index.timeFieldName;
    }
    if (timeFieldName && !columns.includes(timeFieldName)) {
      columns = [timeFieldName, ...columns];
    }
  }

  const absoluteTimeFilter = data.query.timefilter.timefilter.createFilter(index);
  const relativeTimeFilter = data.query.timefilter.timefilter.createRelativeFilter(index);
  return {
    getSearchSource: ({
      addGlobalTimeFilter,
      absoluteTime,
    }: {
      addGlobalTimeFilter?: boolean;
      absoluteTime?: boolean;
    }): SerializedSearchSourceFields => {
      let existingFilter = searchSource.getField('filter') as Filter[] | Filter | undefined;
      const searchSourceUpdated = searchSource.createCopy();
      searchSourceUpdated.removeField('filter');

      const timeFilter = absoluteTime ? absoluteTimeFilter : relativeTimeFilter;
      if (addGlobalTimeFilter && timeFilter) {
        // remove timeFilter from existing filter
        if (Array.isArray(existingFilter)) {
          existingFilter = existingFilter.filter(
            (current) => !isEqualFilters(current, absoluteTimeFilter)
          );
        } else if (isEqualFilters(existingFilter, absoluteTimeFilter)) {
          existingFilter = undefined;
        }

        if (existingFilter) {
          existingFilter = Array.isArray(existingFilter)
            ? [timeFilter, ...existingFilter]
            : ([timeFilter, existingFilter] as Filter[]);
        } else {
          existingFilter = timeFilter;
        }
      }

      if (existingFilter) {
        searchSourceUpdated.setField('filter', existingFilter);
      }

      /*
       * For downstream querying performance, the searchSource object must have fields set.
       * Otherwise, the requests will ask for all fields, even if only a few are really needed.
       * Discover does not set fields, since having all fields is needed for the UI.
       */
      searchSourceUpdated.removeField('fieldsFromSource');
      const fields = columns.length
        ? columns.map((column) => {
            let field = column;

            // If this column is a nested field, add a wildcard to the field name in order to fetch
            // all leaf fields for the report, since the fields API doesn't support nested field roots
            if (isNestedFieldParent(column, index)) {
              field = `${column}.*`;
            }

            return { field, include_unmapped: true };
          })
        : [{ field: '*', include_unmapped: true }];
      searchSourceUpdated.setField('fields', fields);

      return searchSourceUpdated.getSerializedFields(true);
    },
    columns,
  };
}

export interface DiscoverCapabilities {
  createShortUrl?: boolean;
  save?: boolean;
  show?: boolean;
  storeSearchSession?: boolean;
}

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.discover_v2) return false;

  const discover = anonymousUserCapabilities.discover_v2 as unknown as DiscoverCapabilities;

  return !!discover.show;
};
